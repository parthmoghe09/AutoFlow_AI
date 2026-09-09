const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const socket = require("../socket");
const postRemediationVerifier = require("../utils/postRemediationVerifier");
const { processLearningFeedback } = require("../utils/learningEngine");
const { getActiveSimulation, clearActiveSimulation } = require("./simulateRoutes");

router.post("/", async (req, res) => {
  const {
    action_id,
    decision_id,
    action_type,
    action_status,
    service_name = "demo-app",
    namespace = "default"
  } = req.body;

  if (!action_id || !decision_id || !action_type || !action_status) {
    return res.status(400).json({ error: "Missing required fields: action_id, decision_id, action_type, action_status" });
  }

  try {
    // 1. Fetch event detection time and initial metadata for true lifecycle MTTR calculation
    const decRes = await pool.query(
      `SELECT d.event_id, d.remediation_action, e.recorded_at, e.service_name, e.namespace, e.metric_type, e.metric_value
       FROM autoflow_decisions d
       LEFT JOIN autoflow_events e ON d.event_id = e.event_id
       WHERE d.decision_id = $1`,
      [decision_id]
    );

    if (!decRes.rows || decRes.rows.length === 0) {
      return res.status(404).json({ error: "DECISION_NOT_FOUND", message: `Decision '${decision_id}' does not exist.` });
    }

    const event_id = decRes.rows[0]?.event_id;
    const recordedAt = decRes.rows[0]?.recorded_at;
    const targetService = decRes.rows[0]?.service_name || service_name;
    const targetNamespace = decRes.rows[0]?.namespace || namespace;
    const incidentMetricType = decRes.rows[0]?.metric_type || "cpu_usage";
    const initialMetricValue = decRes.rows[0]?.metric_value !== undefined && decRes.rows[0]?.metric_value !== null ? parseFloat(decRes.rows[0]?.metric_value) : null;

    const activeSim = getActiveSimulation(targetService, targetNamespace);
    const execution_id = activeSim?.execution_id || null;

    let verifiedOutcome = "INCONCLUSIVE";
    let recoveryMetricValue = null;
    let verificationDetails = null;
    let realVerificationSamples = [];

    // 2. Authoritative Post-Remediation Verification via Live Prometheus
    if (action_status === "success") {
      try {
        console.log(`[actionRoutes] Triggering live Prometheus post-remediation verification for action '${action_id}' on '${targetService}' (metric: ${incidentMetricType})...`);
        const verification = await postRemediationVerifier.verifyRecovery(
          action_type,
          targetService,
          targetNamespace,
          { metricType: incidentMetricType, timeoutMs: 15000, pollIntervalMs: 2000, requiredStableSamples: 1 }
        );

        verifiedOutcome = verification.outcome || "INCONCLUSIVE";
        recoveryMetricValue = verification.recovery_metric_value !== null ? verification.recovery_metric_value : null;
        verificationDetails = verification.details || null;
        const observed = Array.isArray(verification.observed_samples) ? verification.observed_samples : [];

        // Build real verification samples strictly from actual data:
        // Initial anomaly metric value followed by real observed samples
        if (initialMetricValue !== null) {
          realVerificationSamples.push(initialMetricValue);
        }
        for (const s of observed) {
          realVerificationSamples.push(s);
        }
        if (recoveryMetricValue !== null && (realVerificationSamples.length === 0 || realVerificationSamples[realVerificationSamples.length - 1] !== recoveryMetricValue)) {
          realVerificationSamples.push(recoveryMetricValue);
        }
      } catch (verErr) {
        console.warn(`[actionRoutes] Verification exception: ${verErr.message}. Marking INCONCLUSIVE.`);
        verifiedOutcome = "INCONCLUSIVE";
      }
    } else {
      // Execution failed at remediation microservice/Kubernetes layer
      verifiedOutcome = "FAILURE";
    }

    // 3. Compute True Lifecycle MTTR (from event recorded_at to confirmed resolution)
    const resolvedAt = new Date();
    let trueMttrSeconds = 1;
    if (recordedAt) {
      const diffMs = resolvedAt.getTime() - new Date(recordedAt).getTime();
      trueMttrSeconds = Math.max(1, Math.round(diffMs / 1000));
    }

    // 4. Persist Action Record with Authoritative Outcome in PostgreSQL
    await pool.query(
      `INSERT INTO autoflow_actions
       (action_id, decision_id, action_type, action_status,
        outcome, recovery_metric_value, mttr_seconds,
        executed_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       ON CONFLICT (action_id) DO UPDATE
       SET action_status = EXCLUDED.action_status,
           outcome = EXCLUDED.outcome,
           recovery_metric_value = EXCLUDED.recovery_metric_value,
           mttr_seconds = EXCLUDED.mttr_seconds,
           resolved_at = EXCLUDED.resolved_at;`,
      [
        action_id,
        decision_id,
        action_type,
        action_status,
        verifiedOutcome,
        recoveryMetricValue,
        trueMttrSeconds,
        resolvedAt
      ]
    );

    // 5. Update Event Lifecycle Status
    const finalEventStatus =
      verifiedOutcome === "SUCCESS" ? "resolved" :
      verifiedOutcome === "FAILURE" ? "escalated" :
      (action_status === "success" ? "resolved" : "escalated");

    if (event_id) {
      await pool.query(
        `UPDATE autoflow_events SET status = $1 WHERE event_id = $2`,
        [finalEventStatus, event_id]
      );
    }

    // Clear active simulation tracker now that event is resolved / evaluated
    clearActiveSimulation();

    // 6. Execute Persistent Closed-Loop Learning Feedback (Idempotent & Transactional)
    let learningResult = null;
    try {
      learningResult = await processLearningFeedback(action_id, decision_id, verifiedOutcome, { action_status });
    } catch (learnErr) {
      console.error("[actionRoutes] Learning feedback execution error:", learnErr);
    }

    // 7. Emit Real-time WebSocket Updates
    try {
      const fullResult = await pool.query(`
        SELECT
          e.event_id, e.service_name, e.namespace, e.metric_type, e.metric_value,
          e.z_score, e.anomaly_severity, e.status, e.recorded_at,
          d.consensus_score, d.decision,
          d.anomaly_agent_score, d.risk_agent_score, d.sla_agent_score, d.context_agent_score,
          d.anomaly_reasoning, d.risk_reasoning, d.sla_reasoning, d.context_reasoning,
          a.action_type, a.action_status, a.mttr_seconds, a.outcome, a.recovery_metric_value
        FROM autoflow_actions a
        JOIN autoflow_decisions d ON a.decision_id = d.decision_id
        JOIN autoflow_events e ON d.event_id = e.event_id
        WHERE a.action_id = $1
      `, [action_id]);

      if (fullResult.rows[0]) {
        socket.getIO().emit("incident_update", {
          ...fullResult.rows[0],
          execution_id,
          verification_samples: realVerificationSamples,
          verified_outcome: verifiedOutcome,
          recovery_metric_value: recoveryMetricValue
        });
      } else {
        socket.getIO().emit("incident_update", {
          action_id, decision_id, event_id,
          action_type, action_status,
          outcome: verifiedOutcome,
          recovery_metric_value: recoveryMetricValue,
          mttr_seconds: trueMttrSeconds,
          status: finalEventStatus,
          execution_id,
          verification_samples: realVerificationSamples,
          verified_outcome: verifiedOutcome
        });
      }
    } catch (fetchErr) {
      socket.getIO().emit("incident_update", {
        action_id, decision_id, event_id,
        action_type, action_status,
        outcome: verifiedOutcome,
        recovery_metric_value: recoveryMetricValue,
        mttr_seconds: trueMttrSeconds,
        status: finalEventStatus,
        execution_id,
        verification_samples: realVerificationSamples,
        verified_outcome: verifiedOutcome
      });
    }

    // Emit updated metrics and weights over WebSocket
    try {
      const metricsRes = await pool.query(`
        SELECT
          COUNT(DISTINCT e.event_id)                                    AS events_24h,
          COUNT(DISTINCT CASE WHEN e.is_anomaly THEN e.event_id END)    AS anomalies_24h,
          COUNT(DISTINCT a.action_id)                                   AS actions_taken,
          ROUND(AVG(a.mttr_seconds)::NUMERIC, 1)                       AS avg_mttr_seconds,
          ROUND(
            100.0 * COUNT(CASE WHEN a.action_status = 'success' THEN 1 END)
            / NULLIF(COUNT(a.action_id), 0)
          , 1)                                                          AS success_rate_percent
        FROM autoflow_events e
        LEFT JOIN autoflow_decisions d ON e.event_id = d.event_id
        LEFT JOIN autoflow_actions   a ON d.decision_id = a.decision_id
        WHERE e.recorded_at >= NOW() - INTERVAL '24 hours';
      `);
      socket.getIO().emit("metrics_update", metricsRes.rows[0]);

      const weightsRes = await pool.query(`
        SELECT
          agent_name,
          current_weight,
          initial_weight,
          total_predictions,
          correct_predictions,
          ROUND(accuracy_rate::NUMERIC, 3) AS accuracy_rate
        FROM autoflow_agent_weights
        ORDER BY current_weight DESC;
      `);
      socket.getIO().emit("weights_update", weightsRes.rows);
    } catch (metricErr) {
      console.error("Metrics/weights update error in actionRoutes:", metricErr);
    }

    return res.status(200).json({
      success: true,
      action_id,
      decision_id,
      event_id,
      execution_id,
      action_status,
      verified_outcome: verifiedOutcome,
      recovery_metric_value: recoveryMetricValue,
      mttr_seconds: trueMttrSeconds,
      learning_applied: learningResult?.applied || false,
      verification_details: verificationDetails,
      verification_samples: realVerificationSamples
    });

  } catch (err) {
    console.error("Action error in actionRoutes main block:", err);
    res.status(500).json({ error: "Action processing failed", details: err.message });
  }
});

module.exports = router;