"""ThreatForge Feed Bot: rotates context-aware scenarios derived from the ThreatForge scenario design."""
from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
import json
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parents[2] / "data" / "feeds"
FILES = ["siem.json", "cyber_sensor.json", "satellite.json", "intelligence.json"]
_INDEX = 0
_INTERVAL_SECONDS = 10

def _load_file(filename: str) -> dict:
    with (BASE_DIR / filename).open("r", encoding="utf-8") as f:
        return json.load(f)

def next_event() -> Dict[str, Any]:
    global _INDEX
    # Round-robin source selection; within each source, rotate through every PDF-aligned scenario.
    file_index = _INDEX % len(FILES)
    event_index = (_INDEX // len(FILES))
    filename = FILES[file_index]
    data = _load_file(filename)
    events = data.get("events", [])
    if not events:
        raise ValueError(f"Feed file contains no events: {filename}")
    event = deepcopy(events[event_index % len(events)])
    source = data.get("source", filename.rsplit(".", 1)[0])
    now = datetime.now(timezone.utc).replace(microsecond=0)
    sequence = _INDEX + 1
    event["timestamp"] = now.strftime("%Y-%m-%d %H:%M:%S")
    event["feed_bot_sequence"] = sequence
    event["observation_id"] = f"BOT-{source.upper().replace(' ', '-').replace('/', '-')}-{sequence:05d}"
    event["generated_by"] = "ThreatForge Feed Bot"
    event["scenario_source"] = "ThreatForge_Alert_Classification_and_Scenarios.pdf"
    _INDEX += 1
    return {"source": source, "payload": event, "feedFile": filename, "sequence": sequence}

def status() -> dict:
    return {
        "enabled": True,
        "intervalSeconds": _INTERVAL_SECONDS,
        "scenarioCatalog": "PDF-aligned context-aware scenarios",
        "sources": [
            {"source": _load_file(f).get("source", f), "file": f, "events": len(_load_file(f).get("events", []))}
            for f in FILES
        ],
        "nextSequence": _INDEX + 1,
    }

def reset() -> None:
    global _INDEX
    _INDEX = 0
