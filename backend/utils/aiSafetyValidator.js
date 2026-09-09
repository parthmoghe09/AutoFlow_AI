// backend/utils/aiSafetyValidator.js
/**
 * AutoFlow AI Output Safety Guardrail & Consensus Engine
 * Enforces REQ-SAFETY-001 and AD-AI-001:
 * - Server-authoritative consensus calculation
 * - Strict schema & finite domain validation [0.0, 1.0]
 * - Excludes malformed/NaN/Infinity/non-numeric scores
 * - Enforces minimum 3 valid agent quorum
 * - Renormalizes weights over active valid agents
 * - Validates remediation actions against approved vocabulary
 * - Fails closed on any pipeline exception
 */

const EXPECTED_AGENTS = ["anomaly", "risk", "sla", "context"];
const DEFAULT_WEIGHTS = { anomaly: 0.30, risk: 0.35, sla: 0.25, context: 0.10 };
const VALID_REMEDIATION_ACTIONS = [
  "restart_pod",
  "scale_service",
  "reroute_traffic",
  "drain_node",
  "cleanup_disk",
  "reschedule_pod"
];

/**
 * Validates a single agent score strictly.
 * Rejects booleans, objects, arrays, null, undefined, whitespace strings, NaN, Infinity, and out-of-domain values.
 */
function validateScore(rawScore) {
  if (rawScore === null || rawScore === undefined || rawScore === "") return null;
  if (typeof rawScore === "boolean") return null;
  if (typeof rawScore === "object") return null;

  let num;
  if (typeof rawScore === "number") {
    num = rawScore;
  } else if (typeof rawScore === "string") {
    const trimmed = rawScore.trim();
    if (trimmed === "") return null;
    num = Number(trimmed);
  } else {
    return null;
  }

  if (!Number.isFinite(num)) return null;
  if (num < 0.0 || num > 1.0) return null;

  return num;
}

/**
 * Sanitizes agent weights object.
 */
function sanitizeWeights(customWeights) {
  const sanitized = {};
  for (const agent of EXPECTED_AGENTS) {
    const wRaw = customWeights ? customWeights[agent] : undefined;
    const wNum = (typeof wRaw === "number" && Number.isFinite(wRaw) && wRaw >= 0)
      ? wRaw
      : DEFAULT_WEIGHTS[agent];
    sanitized[agent] = wNum;
  }

  const totalSum = Object.values(sanitized).reduce((acc, v) => acc + v, 0);
  if (!Number.isFinite(totalSum) || totalSum <= 0) {
    return { ...DEFAULT_WEIGHTS };
  }
  return sanitized;
}

/**
 * Parses raw agent input structures safely.
 */
function parseRawAgent(agentInputs, agentName, fallbackIndex) {
  if (!Array.isArray(agentInputs)) {
    return { valid: false, score: null, reasoning: "Inputs not an array", recommended_action: null };
  }

  try {
    let source = agentInputs.find(item => {
      const content = item?.json?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") return false;
      return content.includes(`"agent":"${agentName}"`) || content.includes(`"agent": "${agentName}"`);
    });

    if (!source && agentInputs[fallbackIndex]?.json?.choices) {
      source = agentInputs[fallbackIndex];
    }

    if (!source) {
      return { valid: false, score: null, reasoning: `Agent ${agentName} output not found`, recommended_action: null };
    }

    const text = source.json.choices[0].message.content;
    if (typeof text !== "string" || !text.trim()) {
      return { valid: false, score: null, reasoning: "Empty LLM text", recommended_action: null };
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { valid: false, score: null, reasoning: "Parsed JSON is not an object", recommended_action: null };
    }

    const score = validateScore(parsed.score);
    const valid = score !== null;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : (valid ? "No reasoning provided" : "Invalid score");
    const recommended_action = typeof parsed.recommended_action === "string" ? parsed.recommended_action : null;

    return {
      valid,
      score,
      reasoning,
      recommended_action,
      confidence: validateScore(parsed.confidence) ?? 0.5
    };
  } catch (err) {
    return { valid: false, score: null, reasoning: `Parse error: ${err.message}`, recommended_action: null };
  }
}

/**
 * Server-Authoritative Safety Pipeline:
 * Evaluates agent inputs or structured scores, checks minimum quorum (>= 3),
 * calculates weight-renormalized consensus, determines server-side decision & action,
 * and fails closed on any exception.
 */
function evaluateConsensusSafety(event = {}, rawAgentInputs = [], customWeights = {}) {
  try {
    const weights = sanitizeWeights(customWeights);
    const agentsData = {};
    const validAgentNames = [];

    if (Array.isArray(rawAgentInputs) && rawAgentInputs.length > 0 && rawAgentInputs[0]?.json?.choices) {
      // LLM Raw Response Objects
      for (let i = 0; i < EXPECTED_AGENTS.length; i++) {
        const agentName = EXPECTED_AGENTS[i];
        const parsed = parseRawAgent(rawAgentInputs, agentName, i);
        agentsData[agentName] = parsed;
        if (parsed.valid) {
          validAgentNames.push(agentName);
        }
      }
    } else if (typeof rawAgentInputs === "object" && rawAgentInputs !== null && !Array.isArray(rawAgentInputs)) {
      // Direct structured agent map object (e.g. { anomaly: { score: 0.9 }, risk: 0.8 })
      for (const agentName of EXPECTED_AGENTS) {
        const item = rawAgentInputs[agentName];
        let score = null;
        let reasoning = "No reasoning provided";
        let recAction = null;

        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          score = validateScore(item.score);
          if (typeof item.reasoning === "string") reasoning = item.reasoning;
          if (typeof item.recommended_action === "string") recAction = item.recommended_action;
        } else {
          score = validateScore(item);
        }

        const valid = score !== null;
        agentsData[agentName] = { valid, score, reasoning, recommended_action: recAction };
        if (valid && !validAgentNames.includes(agentName)) {
          validAgentNames.push(agentName);
        }
      }
    } else if (Array.isArray(rawAgentInputs)) {
      // Array of score values or objects
      // Track seen agents to prevent duplicates
      const seenAgents = new Set();

      for (let i = 0; i < rawAgentInputs.length; i++) {
        const item = rawAgentInputs[i];
        let targetAgent = null;
        let score = null;
        let reasoning = "Score provided";
        let recAction = null;

        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          targetAgent = item.agent || EXPECTED_AGENTS[i];
          if (EXPECTED_AGENTS.includes(targetAgent) && !seenAgents.has(targetAgent)) {
            score = validateScore(item.score);
            if (typeof item.reasoning === "string") reasoning = item.reasoning;
            if (typeof item.recommended_action === "string") recAction = item.recommended_action;
          }
        } else {
          targetAgent = EXPECTED_AGENTS[i];
          if (targetAgent && !seenAgents.has(targetAgent)) {
            score = validateScore(item);
          }
        }

        if (targetAgent && EXPECTED_AGENTS.includes(targetAgent) && !seenAgents.has(targetAgent)) {
          seenAgents.add(targetAgent);
          const valid = score !== null;
          agentsData[targetAgent] = { valid, score, reasoning, recommended_action: recAction };
          if (valid) {
            validAgentNames.push(targetAgent);
          }
        }
      }

      // Ensure all 4 expected agents have entries in agentsData
      for (const agentName of EXPECTED_AGENTS) {
        if (!agentsData[agentName]) {
          agentsData[agentName] = { valid: false, score: null, reasoning: "Missing agent score", recommended_action: null };
        }
      }
    }

    const validCount = validAgentNames.length;

    // Minimum Quorum Gate (AD-AI-001: Must have >= 3 valid agents)
    if (validCount < 3) {
      return {
        quorum_met: false,
        valid_agent_count: validCount,
        consensus_score: null,
        decision: "manual_review",
        remediation_action: null,
        agents: agentsData,
        weights_used: weights,
        reason: `Quorum failure: Only ${validCount} valid agent(s) out of 4 expected`
      };
    }

    // Weight Renormalization over active valid agents
    let validWeightSum = 0;
    for (const name of validAgentNames) {
      validWeightSum += weights[name];
    }

    if (!Number.isFinite(validWeightSum) || validWeightSum <= 0) {
      return {
        quorum_met: false,
        valid_agent_count: validCount,
        consensus_score: null,
        decision: "manual_review",
        remediation_action: null,
        agents: agentsData,
        weights_used: weights,
        reason: "Valid agent total weight is zero or non-finite"
      };
    }

    let rawConsensus = 0;
    for (const name of validAgentNames) {
      const renormWeight = weights[name] / validWeightSum;
      rawConsensus += agentsData[name].score * renormWeight;
    }

    const consensus_score = Math.round(rawConsensus * 10000) / 10000;

    if (!Number.isFinite(consensus_score) || consensus_score < 0.0 || consensus_score > 1.0) {
      return {
        quorum_met: false,
        valid_agent_count: validCount,
        consensus_score: null,
        decision: "manual_review",
        remediation_action: null,
        agents: agentsData,
        weights_used: weights,
        reason: "Calculated consensus score out of bounds or non-finite"
      };
    }

    // Server-Authoritative Decision & Action Validation
    let decision = "ignore";
    let remediation_action = null;

    if (consensus_score < 0.30) {
      decision = "ignore";
      remediation_action = null;
    } else if (consensus_score < 0.60) {
      decision = "alert";
      remediation_action = null;
    } else {
      decision = "remediate";
      const alertCategory = event.alert_category || null;
      const metricType = event.metric_type;

      if (alertCategory === "pod_scheduling_failure" || metricType === "pod_scheduling") {
        remediation_action = "reschedule_pod";
      } else if (alertCategory === "critical_disk_space" || alertCategory === "low_disk_space" || metricType === "disk_space_free_percent") {
        remediation_action = "cleanup_disk";
      } else {
        const candidateActions = validAgentNames.map(n => agentsData[n].recommended_action);
        const approvedAction = candidateActions.find(a => VALID_REMEDIATION_ACTIONS.includes(a));
        remediation_action = approvedAction || "restart_pod";
      }
    }

    return {
      quorum_met: true,
      valid_agent_count: validCount,
      consensus_score,
      decision,
      remediation_action,
      agents: agentsData,
      weights_used: weights,
      reason: "Consensus evaluation completed successfully"
    };

  } catch (fatalErr) {
    // FAIL CLOSED on any unexpected pipeline exception
    return {
      quorum_met: false,
      valid_agent_count: 0,
      consensus_score: null,
      decision: "manual_review",
      remediation_action: null,
      agents: {},
      weights_used: DEFAULT_WEIGHTS,
      reason: `Pipeline exception: ${fatalErr.message}`
    };
  }
}

module.exports = {
  validateScore,
  sanitizeWeights,
  parseRawAgent,
  evaluateConsensusSafety,
  EXPECTED_AGENTS,
  DEFAULT_WEIGHTS,
  VALID_REMEDIATION_ACTIONS
};
