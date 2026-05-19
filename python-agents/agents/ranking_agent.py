from datetime import datetime

def calculate_score(provider: dict, request: dict) -> dict:
    """Exact scoring formula from Super Prompt"""
    distance_km = provider.get('distance_km', 10)
    distance_score    = max(0, 10 - distance_km) * 0.35
    rating_score      = (provider.get('rating', 3.0) / 5.0) * 10 * 0.30
    avail_score       = (1 if request.get('time_preference','') in str(provider.get('availability_slots', [])) or len(provider.get('availability_slots',[])) > 0 else 0) * 10 * 0.25
    verified_bonus    = 1.5 if provider.get('verified', False) else 0.0
    total = distance_score + rating_score + avail_score + verified_bonus

    # Urgency boost: if emergency + same-day slots available
    if request.get('urgency_level') == 'emergency' and len(provider.get('availability_slots', [])) > 0:
        total += 0.5

    return {
        'total': round(total, 2),
        'breakdown': {
            'distance_score': round(distance_score, 2),
            'rating_score': round(rating_score, 2),
            'availability_score': round(avail_score, 2),
            'verified_bonus': verified_bonus,
        }
    }

def run_ranking_agent(providers: list, intent: dict, trace: list) -> dict:
    trace.append({'agent': 'RankingAgent', 'started_at': datetime.now().isoformat(),
                  'input': {'providers_count': len(providers), 'intent_summary': str(intent)[:200]}})

    if not providers:
        trace[-1].update({'status': 'no_providers', 'completed_at': datetime.now().isoformat()})
        return {'ranked': [], 'top3': []}

    scored = []
    for p in providers:
        score_data = calculate_score(p, intent)
        reasoning = _build_reasoning(p, score_data, intent)
        scored.append({**p, 'score': score_data['total'], 'score_breakdown': score_data['breakdown'], 'reasoning': reasoning})

    scored.sort(key=lambda x: x['score'], reverse=True)

    # Build "why not" explanations for non-top providers
    top = scored[0] if scored else None
    for i, p in enumerate(scored):
        if i == 0:
            p['rank'] = 1
            p['why_selected'] = f"Highest overall score ({p['score']:.1f}/11.5): best balance of proximity, rating, and availability."
        else:
            p['rank'] = i + 1
            p['why_not'] = _why_not(p, top)

    result = {'ranked': scored, 'top3': scored[:3], 'total_evaluated': len(scored)}
    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': {
        'top_provider': scored[0]['name'] if scored else None,
        'top_score': scored[0]['score'] if scored else 0,
        'total_evaluated': len(scored),
    }, 'status': 'success'})
    return result

def _build_reasoning(p, score_data, intent):
    parts = []
    parts.append(f"Rating: ⭐ {p.get('rating',0)}/5 ({score_data['breakdown']['rating_score']:.1f} pts)")
    parts.append(f"Distance: {p.get('distance_km',0)}km ({score_data['breakdown']['distance_score']:.1f} pts)")
    parts.append(f"Availability: {', '.join(p.get('availability_slots', [])[:3])} ({score_data['breakdown']['availability_score']:.1f} pts)")
    if p.get('verified'): parts.append("Verified ✓ (+1.5 bonus)")
    if p.get('reliability_score'): parts.append(f"Reliability: {p['reliability_score']*100:.0f}%")
    return ' | '.join(parts)

def _why_not(provider, top):
    if not top: return ''
    diffs = []
    if provider.get('rating', 0) < top.get('rating', 0):
        diffs.append(f"lower rating ({provider.get('rating')} vs {top.get('rating')})")
    if provider.get('distance_km', 0) > top.get('distance_km', 0):
        diffs.append(f"farther away ({provider.get('distance_km')}km vs {top.get('distance_km')}km)")
    if provider.get('cancellation_rate', 0) > top.get('cancellation_rate', 0):
        diffs.append(f"higher cancellation rate ({provider.get('cancellation_rate',0)*100:.0f}%)")
    if not diffs:
        diffs.append(f"lower composite score ({provider.get('score',0):.1f} vs {top.get('score',0):.1f})")
    return 'Rejected: ' + ', '.join(diffs) + '.'
