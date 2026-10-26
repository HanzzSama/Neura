import urllib.request
import json

res = urllib.request.urlopen('http://127.0.0.1:5000/app')
html = res.read().decode('utf-8')

checks = {
    'dynamic_island': 'id="dynamic-island"' in html,
    'island_soundwave': 'island-soundwave' in html,
    'island_notch_stop_btn': 'island-notch-stop-btn' in html,
    'island_user_badge': 'island-user-badge' in html,
    'island_stat_intents': 'island-stat-intents' in html,
    'island_voice_btn': "globalIslandAction('voice')" in html,
    'island_prompts_row': 'island-prompts-row' in html,
    'dynamic_island_js': 'src="/js/dynamic-island.js' in html,
}

print("APP HTML CHECKS:")
for k, v in checks.items():
    print(f"  {k}: {v}")

res_status = urllib.request.urlopen('http://127.0.0.1:5000/api/status')
status_data = json.loads(res_status.read().decode('utf-8'))
print("\nSTATUS API CHECKS:")
print(f"  features_count: {status_data.get('features_count')}")
print(f"  intents_count: {status_data.get('intents_count')}")
print(f"  model_ready: {status_data.get('model_ready')}")
