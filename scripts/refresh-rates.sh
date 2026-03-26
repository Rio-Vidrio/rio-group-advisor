#!/bin/bash
# Refresh static rate history data from FRED
# Run this locally before deploying to update the chart data
# Usage: ./scripts/refresh-rates.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT="$PROJECT_DIR/public/rate-history.json"

echo "Fetching 2 years of rate history from FRED..."

curl -s "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&cosd=$(date -v-2y +%Y-%m-%d 2>/dev/null || date -d '2 years ago' +%Y-%m-%d)" | python3 -c "
import sys, json
from datetime import datetime

lines = [l.strip() for l in sys.stdin if l.strip() and not l.startswith('DATE')]
points = []
for line in lines:
    parts = line.split(',')
    if len(parts) == 2:
        date, rate_str = parts[0].strip(), parts[1].strip()
        if rate_str != '.':
            try:
                conv = float(rate_str)
                if conv > 0:
                    points.append({
                        'date': date,
                        'conventional': conv,
                        'fha': round(conv - 0.25, 3),
                        'va': round(conv - 0.5, 3)
                    })
            except:
                pass

data = {
    'points': points,
    'count': len(points),
    'generatedAt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
}
print(json.dumps(data, indent=2))
" > "$OUTPUT"

COUNT=$(python3 -c "import json; print(json.load(open('$OUTPUT'))['count'])")
echo "✓ Written $COUNT data points to public/rate-history.json"
echo "  Latest: $(python3 -c "import json; pts=json.load(open('$OUTPUT'))['points']; print(f\"{pts[-1]['date']}: {pts[-1]['conventional']}%\") if pts else print('none')")"
