import json, os, uuid
from datetime import datetime
from agents.intent_agent    import run_intent_agent
from agents.discovery_agent import run_discovery_agent
from agents.ranking_agent   import run_ranking_agent
from agents.booking_agent   import run_booking_agent
from agents.followup_agent  import run_followup_agent

TRACE_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'agent_trace.jsonl')
os.makedirs(os.path.dirname(TRACE_FILE), exist_ok=True)

def _save_session_trace(session_id: str, trace: list, result: dict):
    entry = {
        'session_id': session_id,
        'timestamp': datetime.now().isoformat(),
        'plan': 'Intent → Discovery → Ranking → Booking → Followup',
        'agents_used': [t.get('agent') for t in trace if 'agent' in t],
        'reasoning_steps': trace,
        'final_decision': result.get('booking_id', 'No booking'),
        'booking_status': result.get('status', 'unknown'),
    }
    with open(TRACE_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

def orchestrate(text: str, simulate_cancellation: bool = False, force_mode: str = None) -> dict:
    session_id = str(uuid.uuid4())[:8]
    trace = []

    trace.append({'agent': 'Orchestrator', 'started_at': datetime.now().isoformat(),
                  'message': '🚀 Antigravity pipeline initialized. Dispatching 5 agents...',
                  'session_id': session_id})

    # ── AGENT 1: Intent ──────────────────────────────────────────────
    intent = run_intent_agent(text, trace)

    # Force low-confidence demo
    if force_mode == 'LOW_CONFIDENCE':
        intent = {'service_type': None, 'location': None, 'confidence': 0.3,
                  'clarification_needed': True,
                  'clarification_question': 'Aap ko kis qism ki service chahiye aur kis sector mein?'}

    if intent.get('clarification_needed'):
        _save_session_trace(session_id, trace, {'status': 'clarification_needed'})
        return {'success': False, 'mode': 'CLARIFY', 'session_id': session_id,
                'message': intent.get('clarification_question'), 'trace': trace}

    # ── AGENT 2: Discovery ───────────────────────────────────────────
    discovery = run_discovery_agent(intent, trace)
    providers = discovery.get('providers', [])

    if not providers:
        suggestions = discovery.get('adjacent_suggestions', [])
        _save_session_trace(session_id, trace, {'status': 'no_providers'})
        return {'success': False, 'mode': 'NO_PROVIDERS', 'session_id': session_id,
                'message': f"No {intent.get('service_type')} providers found near {intent.get('location')}.",
                'suggestions': suggestions, 'trace': trace}

    # ── AGENT 3: Ranking ─────────────────────────────────────────────
    ranking = run_ranking_agent(providers, intent, trace)
    top3    = ranking.get('top3', [])
    winner  = top3[0] if top3 else providers[0]

    # Force cancellation demo
    if simulate_cancellation or force_mode == 'PROVIDER_CANCELLATION':
        cancelled = run_booking_agent(winner, intent, True, trace)
        trace.append({'agent': 'Orchestrator', 'event': 'AUTO_REROUTE',
                      'message': f"⚡ {winner['name']} cancelled. Auto-routing to next best provider..."})
        winner = top3[1] if len(top3) > 1 else winner
        winner['auto_rerouted'] = True

    # ── AGENT 4: Booking ─────────────────────────────────────────────
    receipt = run_booking_agent(winner, intent, False, trace)

    # ── AGENT 5: Follow-up ───────────────────────────────────────────
    followup = run_followup_agent(receipt, intent, trace)

    trace.append({'agent': 'Orchestrator', 'completed_at': datetime.now().isoformat(),
                  'message': f"✅ Pipeline complete. Booking {receipt.get('booking_id')} confirmed.",
                  'session_id': session_id})

    result = {
        'success': True, 'mode': 'SUCCESS', 'session_id': session_id,
        'intent': intent, 'discovery': {'total_found': discovery.get('total_found', 0)},
        'top3_providers': top3,
        'rejected_providers': [{'name': p.get('name'), 'score': p.get('score'), 'why_not': p.get('why_not')}
                                for p in ranking.get('ranked', [])[3:]],
        'receipt': receipt, 'followup': followup, 'trace': trace,
        'fallback_triggered': simulate_cancellation or force_mode == 'PROVIDER_CANCELLATION',
    }

    _save_session_trace(session_id, trace, receipt)
    return result
