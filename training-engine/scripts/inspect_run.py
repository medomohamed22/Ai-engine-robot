from __future__ import annotations
import json, sys
from pathlib import Path
p=Path(sys.argv[1]); events=p/"events.jsonl"
rows=[json.loads(x) for x in events.read_text().splitlines() if x.strip()]
if not rows: raise SystemExit("No events")
last=rows[-1]; falls=sum(1 for r in rows if r.get("fallen")); best=max(r.get("distance_m",0) for r in rows)
print(json.dumps({"samples":len(rows),"episodes":max(r.get("episode",0) for r in rows),"falls":falls,"best_distance_m":best,"last":last},indent=2))
