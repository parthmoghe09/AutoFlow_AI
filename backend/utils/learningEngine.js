const pool = require("../db/connection");
const { validateScore, EXPECTED_AGENTS } = require("./aiSafetyValidator");

const LEARNING_RATE = 0.05;
const MIN_WEIGHT = 0.05;
const MAX_WEIGHT = 0.60;
const AGENT_NAMES = EXPECTED_AGENTS || ["anomaly", "risk", "sla", "context"];
const DEFAULT_WEIGHTS = { anomaly: 0.25, risk: 0.25, sla: 0.25, context: 0.25 };

/**
 * Updates agent weights and writes learning log entries within an ACID PostgreSQL transaction.
 *
 * Attribution & Correctness Rules:
 * - Only authoritative SUCCESS or FAILURE outcomes produce weight learning updates.
 * - INCONCLUSIVE, MANUAL_REVIEW, or unrecognized outcomes do NOT modify weights or logs.
 * - If action_status was 'failed' (e.g. K8s execution error), remediation failure was infrastructural,
 *   so agents are NOT blamed for failing execution (outcome handled as INCONCLUSIVE / skipped).
 * - If SUCCESS: agents with score >= 0.5 were correct (rewarded), < 0.5 were incorrect (penalized).
 * - If FAILURE: agents with score >= 0.5 were incorrect (penalized), < 0.5 were correct (rewarded).
 * - Idempotency / Duplicate-learning protection: If actionId has already been logged in autoflow_learning_log,
 *   the update is skipped immediately to prevent double-counting.
 * - Concurrency & Atomicity: Uses `BEGIN ... SELECT ... FOR UPDATE ... COMMIT` to guarantee
 *   serializable weight vector updates without read-modify-write race conditions.
 * - Normalization: Vector is normalized to sum strictly to 1.0000 with bounded limits [0.05, 0.60].
 *
 * @param {string} actionId - Unique action ID
 * @param {string} decisionId - Related decision ID
 * @param {string} outcome - Authoritative outcome: 'SUCCESS', 'FAILURE', or 'INCONCLUSIVE'
 * @param {Object} options - Additional execution options (e.g., action_status)
 * @returns {Promise<Object>} Updated weights map and learning logs
 */
async function processLearningFeedback(actionId, decisionId, outcome, options = {}) {
  const normOutcome = String(outcome || "").toUpperCase();

  if (normOutcome !== "SUCCESS" && normOutcome !== "FAILURE") {
    console.log(`[LearningLoop] Outcome is '${normOutcome}'. No weight adjustment applied.`);
    return { applied: false, reason: "INCONCLUSIVE_OR_UNSUPPORTED_OUTCOME" };
  }

  // If the remediation execution itself failed at Kubernetes level, don't blame agent prediction
  if (options.action_status === "failed") {
    console.log(`[LearningLoop] Action status is '${options.action_status}'. Skipping agent blame for execution fault.`);
    return { applied: false, reason: "REMEDIATION_EXECUTION_FAILED" };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Idempotency Check: Protect against duplicate webhooks / API retries
    const existingLogRes = await client.query(
      `SELECT log_id FROM autoflow_learning_log WHERE action_id = $1 LIMIT 1`,
      [actionId]
    );

    if (existingLogRes.rows && existingLogRes.rows.length > 0) {
      console.log(`[LearningLoop] Action '${actionId}' already processed for learning. Skipping duplicate update.`);
      await client.query("ROLLBACK");
      return { applied: false, reason: "DUPLICATE_LEARNING_EVENT_IGNORED" };
    }

    // 2. Fetch the decision to get agent scores and reasoning
    const decRes = await client.query(
      `SELECT anomaly_agent_score, risk_agent_score, sla_agent_score, context_agent_score,
              anomaly_reasoning, risk_reasoning, sla_reasoning, context_reasoning
       FROM autoflow_decisions
       WHERE decision_id = $1`,
      [decisionId]
    );

    if (!decRes.rows || decRes.rows.length === 0) {
      console.warn(`[LearningLoop] Decision '${decisionId}' not found. Cannot update weights.`);
      await client.query("ROLLBACK");
      return { applied: false, reason: "DECISION_NOT_FOUND" };
    }

    const dec = decRes.rows[0];

    // Validate each agent score safely using validateScore
    const rawScores = {
      anomaly: dec.anomaly_agent_score !== null ? parseFloat(dec.anomaly_agent_score) : null,
      risk: dec.risk_agent_score !== null ? parseFloat(dec.risk_agent_score) : null,
      sla: dec.sla_agent_score !== null ? parseFloat(dec.sla_agent_score) : null,
      context: dec.context_agent_score !== null ? parseFloat(dec.context_agent_score) : null
    };

    const agentScores = {};
    const validScores = {};
    for (const name of AGENT_NAMES) {
      const validated = validateScore(rawScores[name]);
      agentScores[name] = validated !== null ? validated : 0.5;
      validScores[name] = validated !== null;
    }

    // 3. Acquire pessimistic row locks on autoflow_agent_weights to prevent concurrency race
    const weightsRes = await client.query(
      `SELECT agent_name, current_weight, initial_weight, total_predictions, correct_predictions, accuracy_rate
       FROM autoflow_agent_weights
       ORDER BY agent_name
       FOR UPDATE`
    );

    const currentWeights = {};
    for (const row of weightsRes.rows) {
      currentWeights[row.agent_name] = {
        weight: parseFloat(row.current_weight),
        initial: parseFloat(row.initial_weight),
        total: parseInt(row.total_predictions, 10) || 0,
        correct: parseInt(row.correct_predictions, 10) || 0,
        accuracy: parseFloat(row.accuracy_rate) || 1.0
      };
    }

    // Fill in any missing defaults
    for (const name of AGENT_NAMES) {
      if (!currentWeights[name]) {
        currentWeights[name] = {
          weight: DEFAULT_WEIGHTS[name],
          initial: DEFAULT_WEIGHTS[name],
          total: 0,
          correct: 0,
          accuracy: 1.0
        };
      }
    }

    // 4. Compute updated trust weights
    const updated = {};
    const isRemediationSuccess = normOutcome === "SUCCESS";

    for (const name of AGENT_NAMES) {
      const c = currentWeights[name];
      const score = agentScores[name];
      const isValidScore = validScores[name];

      // If score was invalid/missing, do not reward or penalize; keep weight unchanged
      if (!isValidScore) {
        updated[name] = {
          agent_name: name,
          old_weight: c.weight,
          new_weight: c.weight,
          was_correct: false,
          total_predictions: c.total,
          correct_predictions: c.correct,
          accuracy_rate: c.accuracy,
          adjustment_reason: `Outcome: ${normOutcome}. Invalid agent score. Weight unchanged.`
        };
        continue;
      }

      // High confidence in action (score >= 0.5)
      // If remediation succeeded, high confidence was correct. If remediation failed, high confidence was wrong.
      const agentWasCorrect = isRemediationSuccess ? score >= 0.5 : score < 0.5;

      let newWeight = c.weight;
      if (agentWasCorrect) {
        newWeight = Math.min(c.weight * (1 + LEARNING_RATE), MAX_WEIGHT);
      } else {
        newWeight = Math.max(c.weight * (1 - LEARNING_RATE), MIN_WEIGHT);
      }

      const totalPreds = c.total + 1;
      const correctPreds = c.correct + (agentWasCorrect ? 1 : 0);
      const accuracyRate = totalPreds > 0 ? Math.round((correctPreds / totalPreds) * 1000) / 1000 : 1.0;

      updated[name] = {
        agent_name: name,
        old_weight: c.weight,
        new_weight: Math.round(newWeight * 10000) / 10000,
        was_correct: agentWasCorrect,
        total_predictions: totalPreds,
        correct_predictions: correctPreds,
        accuracy_rate: accuracyRate,
        adjustment_reason: `Outcome: ${normOutcome}. Agent score: ${score}. Was correct: ${agentWasCorrect}. Accuracy: ${accuracyRate}`
      };
    }

    // 5. Normalize weights to sum strictly to 1.0 with bound enforcement
    const rawSum = Object.values(updated).reduce((sum, w) => sum + w.new_weight, 0);
    for (const name of AGENT_NAMES) {
      let normVal = Math.round((updated[name].new_weight / rawSum) * 10000) / 10000;
      normVal = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, normVal));
      updated[name].new_weight = normVal;
    }

    // Fix remainder rounding to guarantee sum === 1.0000
    const normalizedSum = Object.values(updated).reduce((sum, w) => sum + w.new_weight, 0);
    const diff = Math.round((1.0 - normalizedSum) * 10000) / 10000;
    if (Math.abs(diff) > 0) {
      updated["risk"].new_weight = Math.round((updated["risk"].new_weight + diff) * 10000) / 10000;
    }

    // 6. Atomically persist updated weights and write learning logs in PostgreSQL
    for (const name of AGENT_NAMES) {
      const u = updated[name];
      await client.query(
        `INSERT INTO autoflow_agent_weights
         (agent_name, current_weight, initial_weight, total_predictions, correct_predictions, accuracy_rate, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (agent_name) DO UPDATE
         SET current_weight = EXCLUDED.current_weight,
             total_predictions = EXCLUDED.total_predictions,
             correct_predictions = EXCLUDED.correct_predictions,
             accuracy_rate = EXCLUDED.accuracy_rate,
             updated_at = NOW()`,
        [name, u.new_weight, currentWeights[name].initial, u.total_predictions, u.correct_predictions, u.accuracy_rate]
      );

      await client.query(
        `INSERT INTO autoflow_learning_log
         (action_id, agent_name, old_weight, new_weight, adjustment_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [actionId, name, u.old_weight, u.new_weight, u.adjustment_reason]
      );
    }

    await client.query("COMMIT");
    console.log(`[LearningLoop] Successfully committed transaction for action '${actionId}'.`);
    return { applied: true, outcome: normOutcome, updated };

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[LearningLoop] Transaction failed for action '${actionId}':`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  processLearningFeedback,
  LEARNING_RATE,
  MIN_WEIGHT,
  MAX_WEIGHT,
  AGENT_NAMES,
  DEFAULT_WEIGHTS
};
