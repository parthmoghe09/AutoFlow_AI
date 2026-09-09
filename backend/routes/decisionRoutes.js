const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const socket = require("../socket");
const { evaluateConsensusSafety, EXPECTED_AGENTS, DEFAULT_WEIGHTS } = require("../utils/aiSafetyValidator");
const { getActiveSimulation } = require("./simulateRoutes");

router.post("/", async (req, res) => {
  const d = req.body;

  if (!d.decision_id || !d.event_id) {
    return res.status(400).json({ error: "Missing required fields: decision_id and event_id" });
  }

  if (!d.raw_agent_inputs && !d.agents && !d.agent_scores && d.anomaly_agent_score === undefined && d.consensus_score === undefined) {
    return res.status(400).json({ error: "Missing payload data: provide raw_agent_inputs, agents, agent_scores, or agent score attributes" });
  }

  try {
    // 1. Verify that referenced event_id exists in database for lifecycle correlation integrity
    const eventCheck = await pool.query(`SELECT event_id, service_name, namespace, metric_type FROM autoflow_events WHERE event_id = $1`, [d.event_id]);
    if (!eventCheck.rows || eventCheck.rows.length === 0) {
      return res.status(404).json({ error: "EVENT_NOT_FOUND", message: `Event '${d.event_id}' does not exist.` });
    }
    const eventInfo = eventCheck.rows[0];

    // 2. Fetch authoritative committed agent weights from PostgreSQL database
    let activeWeights = d.weights_used || null;
    if (!activeWeights || Object.keys(activeWeights).length === 0) {
      try {
        const dbWeightsRes = await pool.query(`SELECT agent_name, current_weight FROM autoflow_agent_weights`);
        if (dbWeightsRes.rows && dbWeightsRes.rows.length > 0) {
          activeWeights = {};
          for (const row of dbWeightsRes.rows) {
            activeWeights[row.agent_name] = parseFloat(row.current_weight);
          }
        }
      } catch (wErr) {
        console.warn("[decisionRoutes] Could not fetch DB weights, using defaults:", wErr.message);
        activeWeights = { ...DEFAULT_WEIGHTS };
      }
    }

    // 3. Server-Authoritative AI Safety & Quorum Evaluation
    let evalResult;
    const eventMeta = {
      metric_type: d.metric_type || eventInfo.metric_type,
      alert_category: d.alert_category
    };

    if (d.raw_agent_inputs) {
      evalResult = evaluateConsensusSafety(eventMeta, d.raw_agent_inputs, activeWeights);
    } else if (d.agents) {
      evalResult = evaluateConsensusSafety(eventMeta, d.agents, activeWeights);
    } else if (d.agent_scores && Array.isArray(d.agent_scores)) {
      evalResult = evaluateConsensusSafety(eventMeta, d.agent_scores, activeWeights);
    } else {
      // Direct agent map object
      const agentMap = {
        anomaly: d.anomaly_agent_score,
        risk: d.risk_agent_score,
        sla: d.sla_agent_score,
        context: d.context_agent_score
      };
      evalResult = evaluateConsensusSafety(eventMeta, agentMap, activeWeights);
    }

    const finalConsensusScore = evalResult.consensus_score;
    const finalDecision       = evalResult.decision;
    const finalAction         = evalResult.remediation_action;

    // Extract individual agent score/reasoning safely
    const anomalyScore   = evalResult.agents?.anomaly?.score ?? null;
    const riskScore      = evalResult.agents?.risk?.score ?? null;
    const slaScore       = evalResult.agents?.sla?.score ?? null;
    const contextScore   = evalResult.agents?.context?.score ?? null;

    const anomalyReason  = evalResult.agents?.anomaly?.reasoning || d.anomaly_reasoning || null;
    const riskReason     = evalResult.agents?.risk?.reasoning || d.risk_reasoning || null;
    const slaReason      = evalResult.agents?.sla?.reasoning || d.sla_reasoning || null;
    const contextReason  = evalResult.agents?.context?.reasoning || d.context_reasoning || null;

    const dbConsensusScore = finalConsensusScore !== null ? finalConsensusScore : 0.0000;

    // 4. Persist decision atomically
    await pool.query(
      `INSERT INTO autoflow_decisions
       (decision_id, event_id, consensus_score, decision, remediation_action,
        anomaly_agent_score, risk_agent_score, sla_agent_score, context_agent_score,
        anomaly_reasoning, risk_reasoning, sla_reasoning, context_reasoning,
        weights_used, decided_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (decision_id) DO NOTHING;`,
      [
        d.decision_id,
        d.event_id,
        dbConsensusScore,
        finalDecision,
        finalAction,
        anomalyScore,
        riskScore,
        slaScore,
        contextScore,
        anomalyReason,
        riskReason,
        slaReason,
        contextReason,
        JSON.stringify(evalResult.weights_used || activeWeights || {})
      ]
    );

    const newStatus =
      finalDecision === "remediate" ? "remediating" :
      finalDecision === "alert" ? "alerted" :
      finalDecision === "manual_review" ? "manual_review" :
      "ignored";

    await pool.query(
      `UPDATE autoflow_events SET status = $1 WHERE event_id = $2`,
      [newStatus, d.event_id]
    );

    // 5. Emit updated incident over WebSocket
    try {
      const fullResult = await pool.query(`
        SELECT
          e.event_id, e.service_name, e.namespace, e.metric_type, e.metric_value,
          e.z_score, e.anomaly_severity, e.status, e.recorded_at,
          d.consensus_score, d.decision,
          d.anomaly_agent_score, d.risk_agent_score, d.sla_agent_score, d.context_agent_score,
          d.anomaly_reasoning, d.risk_reasoning, d.sla_reasoning, d.context_reasoning,
          a.action_type, a.action_status, a.mttr_seconds, a.outcome, a.recovery_metric_value
        FROM autoflow_events e
        LEFT JOIN autoflow_decisions d ON e.event_id = d.event_id
        LEFT JOIN autoflow_actions a ON d.decision_id = a.decision_id
        WHERE e.event_id = $1
      `, [d.event_id]);

      const activeSim = getActiveSimulation(eventInfo.service_name, eventInfo.namespace);
      const execution_id = activeSim?.execution_id || null;

      if (fullResult.rows[0]) {
        socket.getIO().emit("incident_update", { ...fullResult.rows[0], execution_id });
      } else {
        socket.getIO().emit("incident_update", {
          ...d,
          execution_id,
          consensus_score: finalConsensusScore,
          decision: finalDecision,
          remediation_action: finalAction,
          service_name: eventInfo.service_name || "unknown",
          namespace: eventInfo.namespace || "default",
          status: newStatus
        });
      }
    } catch (fetchErr) {
      const activeSim = getActiveSimulation(eventInfo.service_name, eventInfo.namespace);
      const execution_id = activeSim?.execution_id || null;

      socket.getIO().emit("incident_update", {
        ...d,
        execution_id,
        consensus_score: finalConsensusScore,
        decision: finalDecision,
        remediation_action: finalAction,
        service_name: eventInfo.service_name || "unknown",
        namespace: eventInfo.namespace || "default",
        status: newStatus
      });
    }

    // Emit updated metrics
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
    } catch (metricErr) { }

    res.json({
      success: true,
      decision: finalDecision,
      consensus_score: finalConsensusScore,
      remediation_action: finalAction,
      valid_agent_count: evalResult.valid_agent_count,
      quorum_met: evalResult.quorum_met,
      weights_used: evalResult.weights_used
    });

  } catch (err) {
    console.error("Decision error in decisionRoutes:", err);
    res.status(500).json({ error: "Decision processing failed", details: err.message });
  }
});

module.exports = router;