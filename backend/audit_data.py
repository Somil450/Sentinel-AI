import sys, re
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

from real_data_fetcher import (
    fetch_who_outbreaks, fetch_promed_alerts, fetch_covid_data,
    fetch_gdelt_health_events, fetch_ncvbdc_dengue, fetch_india_news_rss
)

results = {}

print("=== SOURCE 1: WHO Disease Outbreak News ===")
try:
    who = fetch_who_outbreaks()
    results['WHO DON'] = len(who)
    print(f"  RECORDS: {len(who)}")
    for r in who[:2]:
        print(f"  -> {r['district']} | {r['symptoms']} | {r['free_text'][:60]}")
except Exception as e:
    results['WHO DON'] = 0
    print(f"  ERROR: {e}")

print("")
print("=== SOURCE 2: disease.sh COVID-19 (national + states) ===")
try:
    covid = fetch_covid_data()
    results['disease.sh'] = len(covid)
    print(f"  RECORDS: {len(covid)}")
    # Show state-level breakdown
    by_district = {}
    for r in covid:
        d = r['district']
        by_district[d] = by_district.get(d, 0) + 1
    top5 = sorted(by_district.items(), key=lambda x: -x[1])[:5]
    for dist, cnt in top5:
        print(f"  -> {dist}: {cnt} signals")
except Exception as e:
    results['disease.sh'] = 0
    print(f"  ERROR: {e}")

print("")
print("=== SOURCE 3: India News RSS Feeds ===")
try:
    news = fetch_india_news_rss()
    results['India News RSS'] = len(news)
    print(f"  RECORDS: {len(news)}")
    for r in news[:4]:
        print(f"  -> [{r['source']}] {r['district']} | {r['symptoms']} | {r['free_text'][:60]}")
except Exception as e:
    results['India News RSS'] = 0
    print(f"  ERROR: {e}")

print("")
total = sum(results.values())
print("=" * 55)
print(f"TOTAL LIVE REAL SIGNALS: {total}")
for src, count in results.items():
    status = "LIVE" if count > 0 else "OFFLINE"
    bar = "#" * min(count, 30)
    print(f"  {src:<25} {count:>4} records  [{status}]  {bar}")
