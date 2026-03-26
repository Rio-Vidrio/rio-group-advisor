"""
Fetches 30-year fixed mortgage rate history from FRED REST API.
Requires FRED_API_KEY environment variable (free at fred.stlouisfed.org/docs/api/api_key.html)
"""

import json
import os
import sys
import urllib.request
from datetime import date, timedelta

API_KEY = os.environ.get("FRED_API_KEY", "")
if not API_KEY:
    print("ERROR: FRED_API_KEY environment variable not set.")
    print("Get a free key at: https://fred.stlouisfed.org/docs/api/api_key.html")
    sys.exit(1)

start_date = (date.today() - timedelta(days=730)).isoformat()
today = date.today().isoformat()

url = (
    f"https://api.stlouisfed.org/fred/series/observations"
    f"?series_id=MORTGAGE30US"
    f"&api_key={API_KEY}"
    f"&file_type=json"
    f"&observation_start={start_date}"
    f"&observation_end={today}"
    f"&sort_order=asc"
)

print(f"Fetching FRED API data from {start_date} to {today}...")

req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (compatible; RioGroupAdvisor/1.0)"
})

try:
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = json.loads(response.read().decode("utf-8"))
except Exception as e:
    print(f"ERROR fetching from FRED API: {e}")
    sys.exit(1)

observations = raw.get("observations", [])
if not observations:
    print("ERROR: No observations returned from FRED API")
    print("Response:", json.dumps(raw, indent=2)[:500])
    sys.exit(1)

data = []
for obs in observations:
    date_val = obs.get("date", "").strip()
    rate_val = obs.get("value", "").strip()
    # FRED uses "." for missing data
    if date_val and rate_val and rate_val != ".":
        try:
            data.append({"date": date_val, "rate": float(rate_val)})
        except ValueError:
            pass

if len(data) == 0:
    print("ERROR: No valid data points parsed")
    sys.exit(1)

data.sort(key=lambda x: x["date"])
print(f"Parsed {len(data)} data points")
print(f"Oldest: {data[0]}")
print(f"Latest: {data[-1]}")

output_path = os.path.join(os.path.dirname(__file__), "..", "public", "rate-history.json")
with open(output_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Written to {output_path}")
