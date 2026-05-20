

const fs = require('fs');
const path = require('path');


const LOG_DIR = process.env.VERCEL
  ? path.join('/tmp', 'bazaarai_logs')
  : path.join(__dirname, '..', 'logs');

try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (e) {  }

class LoggingAgent {
  constructor(sessionId) {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.startTime = new Date().toISOString();
    this.log = {
      session_id: this.sessionId,
      start_time: this.startTime,
      plan: '',
      agents_used: [],
      reasoning_steps: [],
      ranking_logic: [],
      tool_calls: [],
      decisions: [],
      errors: [],
      fallback_used: false,
      final_decision: '',
      booking_status: 'pending',
      final_outcome: ''
    };
  }

  setPlan(plan) {
    this.log.plan = plan;
    this._write();
  }

  logAgentStart(agentName, input) {
    const entry = {
      agent: agentName,
      status: 'started',
      timestamp: new Date().toISOString(),
      input: input
    };
    this.log.agents_used.push({ name: agentName, started_at: entry.timestamp });
    this.log.reasoning_steps.push(entry);
    this._write();
    console.log(`[LOG] 🟡 ${agentName} STARTED`);
  }

  logAgentComplete(agentName, output, reasoning = '') {
    const entry = {
      agent: agentName,
      status: 'completed',
      timestamp: new Date().toISOString(),
      output: output,
      reasoning: reasoning
    };
    
    const agent = this.log.agents_used.find(a => a.name === agentName);
    if (agent) agent.completed_at = entry.timestamp;
    this.log.reasoning_steps.push(entry);
    this._write();
    console.log(`[LOG] ✅ ${agentName} COMPLETED`);
  }

  logAgentError(agentName, error) {
    const entry = {
      agent: agentName,
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack
    };
    this.log.errors.push(entry);
    const agent = this.log.agents_used.find(a => a.name === agentName);
    if (agent) agent.error = entry.error;
    this._write();
    console.log(`[LOG] ❌ ${agentName} ERROR: ${entry.error}`);
  }

  logDecision(decision, reason, selectedOption, alternatives = []) {
    this.log.decisions.push({
      timestamp: new Date().toISOString(),
      decision,
      reason,
      selected: selectedOption,
      alternatives
    });
    this._write();
  }

  logRankingLogic(providers, scores) {
    this.log.ranking_logic.push({
      timestamp: new Date().toISOString(),
      providers_evaluated: providers.length,
      scores: scores
    });
    this._write();
  }

  logToolCall(tool, params, result) {
    this.log.tool_calls.push({
      timestamp: new Date().toISOString(),
      tool,
      params,
      result_summary: typeof result === 'string' ? result : JSON.stringify(result).substring(0, 200)
    });
    this._write();
  }

  logFallback(reason, action) {
    this.log.fallback_used = true;
    this.log.reasoning_steps.push({
      type: 'FALLBACK',
      timestamp: new Date().toISOString(),
      reason,
      action
    });
    this._write();
    console.log(`[LOG] ⚠️  FALLBACK TRIGGERED: ${reason} → ${action}`);
  }

  setFinalOutcome(outcome, bookingStatus) {
    this.log.final_decision = outcome;
    this.log.booking_status = bookingStatus || 'unknown';
    this.log.final_outcome = outcome;
    this.log.end_time = new Date().toISOString();
    this._write();
  }

  getFullLog() {
    return this.log;
  }

  getLogPath() {
    return path.join(LOG_DIR, `${this.sessionId}.json`);
  }

  _write() {
    try {
      fs.writeFileSync(
        path.join(LOG_DIR, `${this.sessionId}.json`),
        JSON.stringify(this.log, null, 2)
      );
    } catch (e) {
      console.error('[LOG] Write error:', e.message);
    }
  }
}

module.exports = LoggingAgent;
