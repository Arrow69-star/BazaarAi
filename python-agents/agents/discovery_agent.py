import json, os, math
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'providers.json')

def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1); dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

LOCATION_COORDS = {
    'G-13':{'lat':33.6844,'lon':73.0479},'G-14':{'lat':33.690,'lon':73.055},
    'G-11':{'lat':33.678,'lon':73.042}, 'G-10':{'lat':33.673,'lon':73.040},
    'F-10':{'lat':33.705,'lon':73.070}, 'F-11':{'lat':33.695,'lon':73.060},
    'F-7': {'lat':33.720,'lon':73.075}, 'F-6': {'lat':33.728,'lon':73.080},
    'I-8': {'lat':33.660,'lon':73.030}, 'I-9': {'lat':33.668,'lon':73.038},
    'H-9': {'lat':33.672,'lon':73.050}, 'E-11':{'lat':33.740,'lon':73.090},
    'DHA': {'lat':33.580,'lon':73.080}, 'Bahria':{'lat':33.530,'lon':73.140},
}

# Adjacent categories for fallback suggestions
ADJACENT = {
    'AC Repair':['Electrician','Generator Repair'],
    'Plumbing':['Water Tank Cleaning','Electrician'],
    'Electrician':['AC Repair','Generator Repair'],
    'Cleaning':['Water Tank Cleaning','Painter'],
}

def run_discovery_agent(intent: dict, trace: list) -> dict:
    trace.append({'agent': 'DiscoveryAgent', 'started_at': datetime.now().isoformat(), 'input': intent})

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            all_providers = json.load(f)
    except Exception as e:
        trace[-1].update({'status': 'error', 'error': str(e)}); return {'providers': [], 'error': str(e)}

    svc = intent.get('service_type')
    loc = intent.get('location', 'G-13')
    coords = LOCATION_COORDS.get(loc, {'lat': 33.6844, 'lon': 73.0479})
    RADIUS_KM = 10

    # Filter by service and radius
    matched = []
    for p in all_providers:
        if svc and p.get('service', '').lower() != svc.lower(): continue
        dist = _haversine(coords['lat'], coords['lon'], p['lat'], p['lng'])
        if dist <= RADIUS_KM:
            matched.append({**p, 'distance_km': round(dist, 2)})

    matched.sort(key=lambda x: x['distance_km'])

    # If fewer than 3, expand radius
    if len(matched) < 3:
        for p in all_providers:
            if p in matched: continue
            if svc and p.get('service', '').lower() != svc.lower(): continue
            dist = _haversine(coords['lat'], coords['lon'], p['lat'], p['lng'])
            matched.append({**p, 'distance_km': round(dist, 2)})
        matched.sort(key=lambda x: x['distance_km'])

    # Adjacent category fallback
    adjacent_suggestions = []
    if len(matched) == 0 and svc in ADJACENT:
        adjacent_suggestions = ADJACENT[svc]

    result = {
        'providers': matched,
        'total_found': len(matched),
        'search_radius_km': RADIUS_KM,
        'user_location': loc,
        'user_coords': coords,
        'adjacent_suggestions': adjacent_suggestions,
    }

    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': {
        'total_found': len(matched), 'radius_km': RADIUS_KM, 'location': loc,
    }, 'status': 'success'})
    return result
