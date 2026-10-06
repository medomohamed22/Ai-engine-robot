from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone

class RunLogger:
    def __init__(self, root: str | Path, run_name: str, config: dict):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        self.dir = Path(root) / f"{stamp}_{run_name}"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.events_path = self.dir / "events.jsonl"
        self.summary_path = self.dir / "summary.json"
        self.notes_path = self.dir / "coach_notes.jsonl"
        (self.dir / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

    def event(self, payload: dict):
        payload = {"ts": datetime.now(timezone.utc).isoformat(), **payload}
        with self.events_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def coach_note(self, payload: dict):
        payload = {"ts": datetime.now(timezone.utc).isoformat(), **payload}
        with self.notes_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def summary(self, payload: dict):
        self.summary_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
