import sys
sys.stdout.reconfigure(encoding='utf-8')

print('=== 1. BACKEND IMPORTS ===')
try:
    from database import db
    print('  [OK] database.py')
except Exception as e:
    print(f'  [FAIL] database.py: {e}')

try:
    from ai_engine import symptom_extractor, confidence_engine
    print('  [OK] ai_engine.py')
except Exception as e:
    print(f'  [FAIL] ai_engine.py: {e}')

try:
    from diagnosis_engine import diagnosis_engine, DISEASE_PROFILES
    print(f'  [OK] diagnosis_engine.py -> {len(DISEASE_PROFILES)} disease profiles')
except Exception as e:
    print(f'  [FAIL] diagnosis_engine.py: {e}')

try:
    from real_data_fetcher import fetch_india_news_rss, fetch_covid_data, fetch_who_outbreaks
    print('  [OK] real_data_fetcher.py')
except Exception as e:
    print(f'  [FAIL] real_data_fetcher.py: {e}')

try:
    from prediction_engine import prediction_engine
    print('  [OK] prediction_engine.py')
except Exception as e:
    print(f'  [FAIL] prediction_engine.py: {e}')

try:
    from main import app
    print('  [OK] main.py (FastAPI app loaded)')
except Exception as e:
    print(f'  [FAIL] main.py: {e}')


print('')
print('=== 2. DIAGNOSE ENDPOINT LOGIC ===')
try:
    normalized = symptom_extractor.normalize(['cough', 'fever'], 'I have a cold and mild fever')
    print(f'  [OK] Symptom normalization -> {normalized}')

    class MockDB:
        _reports = [
            {'district': 'New Delhi', 'symptoms': ['fever', 'cough', 'fatigue'], 'is_spam': False, 'source': 'Google News', 'anon_id': 'REAL-GN-001'},
            {'district': 'New Delhi', 'symptoms': ['fever', 'body ache'], 'is_spam': False, 'source': 'Times of India', 'anon_id': 'REAL-TOI-002'},
            {'district': 'New Delhi', 'symptoms': ['cough', 'sore throat'], 'is_spam': False, 'source': 'disease.sh', 'anon_id': 'REAL-DS-003'},
        ]
        _signals = {
            's1': {
                'id': 's1', 'name': 'Respiratory cluster - New Delhi', 'district': 'New Delhi',
                'confidence': 58.0, 'symptoms': ['fever','cough','fatigue'],
                'sources': ['Google News', 'disease.sh'], 'report_count': 3
            }
        }

    result = diagnosis_engine.diagnose(normalized, 'New Delhi', db=MockDB())
    diag_count = len(result['diagnoses'])
    print(f'  [OK] diagnose() returned {diag_count} diseases')
    for i, d in enumerate(result['diagnoses'][:3]):
        active = '** ACTIVE IN AREA **' if d['active_in_area'] else ''
        print(f'       #{i+1} {d["disease"]}: {d["probability"]}% {d["confidence_label"]} {active}')
except Exception as e:
    import traceback
    print(f'  [FAIL] diagnose(): {e}')
    traceback.print_exc()


print('')
print('=== 3. REAL DATA SIGNALS IN DB ===')
try:
    from database import db as live_db
    total = len(live_db._reports)
    real_count = len([r for r in live_db._reports if r.get('anon_id','').startswith('REAL-')])
    user_count = total - real_count
    districts = set(r['district'] for r in live_db._reports)
    sources = set(r.get('source','') for r in live_db._reports if r.get('source'))
    print(f'  [OK] Total DB reports: {total}')
    print(f'       Real external data: {real_count}')
    print(f'       User reports: {user_count}')
    print(f'       Districts covered: {len(districts)}')
    print(f'       Active sources: {sources}')
except Exception as e:
    print(f'  [FAIL] DB check: {e}')


print('')
print('=== 4. API ROUTES ===')
try:
    from main import app
    routes = [r.path for r in app.routes if hasattr(r, 'path')]
    needed = ['/api/report', '/api/signals', '/api/heatmap', '/api/predictions',
              '/api/forecast', '/api/diagnose', '/api/sources', '/api/trends']
    for route in needed:
        status = '[OK]' if route in routes else '[MISSING]'
        print(f'  {status} {route}')
except Exception as e:
    print(f'  [FAIL] Routes: {e}')


print('')
print('=== 5. FRONTEND FILES ===')
import os
frontend_files = [
    '../frontend/src/pages/DiagnoseMe.jsx',
    '../frontend/src/pages/Dashboard.jsx',
    '../frontend/src/pages/Heatmap.jsx',
    '../frontend/src/pages/Predictions.jsx',
    '../frontend/src/pages/Intelligence.jsx',
    '../frontend/src/pages/ReportForm.jsx',
    '../frontend/src/App.jsx',
    '../frontend/src/lib/api.js',
]
for f in frontend_files:
    exists = os.path.exists(f)
    size = os.path.getsize(f) if exists else 0
    status = f'[OK] {size} bytes' if exists else '[MISSING]'
    print(f'  {status}  {os.path.basename(f)}')

# Check DiagnoseMe tab in App.jsx
with open('../frontend/src/App.jsx', 'r', encoding='utf-8') as fh:
    app_content = fh.read()
if 'DiagnoseMe' in app_content and 'ti-stethoscope' in app_content:
    print('  [OK] DiagnoseMe tab registered in App.jsx')
else:
    print('  [MISSING] DiagnoseMe tab in App.jsx')

# Check diagnose in api.js
with open('../frontend/src/lib/api.js', 'r', encoding='utf-8') as fh:
    api_content = fh.read()
if 'diagnose' in api_content:
    print('  [OK] api.diagnose() method in api.js')
else:
    print('  [MISSING] api.diagnose() in api.js')

print('')
print('=== ALL CHECKS COMPLETE ===')
