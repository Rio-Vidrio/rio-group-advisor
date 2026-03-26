"""
Fetches 2 years of 30-year fixed mortgage rate history from FRED REST API,
then slices into all 4 time ranges and saves as a structured JSON file.

Output format:
{
  "updated": "2026-03-27",
  "3months":  [{ "date": "YYYY-MM-DD", "conventional": 6.91, "fha": 6.66, "va": 6.41 }, ...],
  "6months":  [...],
  "1year":    [...],
  "2years":   [...]
}

Requires FRED_API_KEY environment variable (free at fred.stlouisfed.org/docs/api/api_key.html)
"""

import json, os, sys, urllib.request
from datetime import date, timedelta

API_KEY = os.environ.get("FRED_API_KEY", "")
if not API_KEY:
    print("ERROR: FRED_API_KEY environment variable not set.")
    sys.exit(1)

today      = date.today()
start_date = (today - timedelta(days=730)).isoformat()   # Always fetch full 2 years

url = (
    "https://api.stlouisfed.org/fred/series/observations"
    f"?series_id=MORTGAGE30US"
    f"&api_key={API_KEY}"
    f"&file_type=json"
    f"&observation_start={start_date}"
    f"&observation_end={today.isoformat()}"
    f"&sort_order=asc"
)

print(f"Fetching FRED data from {start_date} to {today}...")

req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (compatible; RioGroupAdvisor/1.0)"
})

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
except Exception as e:
    print(f"ERROR fetching from FRED API: {e}")
    sys.exit(1)

observations = raw.get("observations", [])
if not observations:
    print("ERROR: No observations returned")
    sys.exit(1)

# Build full dataset with conventional + derived FHA/VA
all_points = []
for obs in observations:
    d = obs.get("date", "").strip()
    v = obs.get("value", "").strip()
    if d and v and v != ".":
        try:
            conv = round(float(v), 2)
            all_points.append({
                "date":         d,
                "conventional": conv,
                "fha":          round(conv - 0.25, 2),
                "va":           round(conv - 0.50, 2),
            })
        except ValueError:
            pass

if not all_points:
    print("ERROR: No valid data points parsed")
    sys.exit(1)

all_points.sort(key=lambda x: x["date"])
print(f"Fetched {len(all_points)} total data points")
print(f"Oldest: {all_points[0]['date']} @ {all_points[0]['conventional']}%")
print(f"Latest: {all_points[-1]['date']} @ {all_points[-1]['conventional']}%")

# Slice into 4 ranges by cutoff date
cutoffs = {
    "3months": today - timedelta(days=91),
    "6months": today - timedelta(days=182),
    "1year":   today - timedelta(days=365),
    "2years":  today - timedelta(days=730),
}

output = {"updated": today.isoformat()}
for key, cutoff in cutoffs.items():
    cutoff_str = cutoff.isoformat()
    sliced = [p for p in all_points if p["date"] >= cutoff_str]
    output[key] = sliced
    print(f"  {key}: {len(sliced)} points (from {sliced[0]['date'] if sliced else 'n/a'})")

out_path = os.path.join(os.path.dirname(__file__), "..", "public", "rate-history.json")
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)

print(f"\nWritten to {out_path}")
