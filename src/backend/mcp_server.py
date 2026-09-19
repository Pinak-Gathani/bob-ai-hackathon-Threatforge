"""ThreatForge MCP server for IBM Bob.

This is a dependency-light local STDIO MCP server. It exposes read-only
investigation tools backed by the running ThreatForge FastAPI service.

IBM Bob can register this file as a project MCP server using Python.
"""
from __future__ import annotations
import json
import sys
import urllib.request
import urllib.parse
import os

BASE = os.environ.get("THREATFORGE_API_URL", "http://127.0.0.1:8000") .rstrip("/") + "/api/v1"

TOOLS = [
    {"name":"get_incident","description":"Retrieve a correlated ThreatForge incident with priority, confidence, timeline, evidence rationale and MITRE techniques.","inputSchema":{"type":"object","properties":{"incident_id":{"type":"string","description":"ThreatForge incident ID, e.g. INC-001"}},"required":["incident_id"]}},
    {"name":"get_correlated_alerts","description":"Retrieve the alerts correlated into a ThreatForge incident.","inputSchema":{"type":"object","properties":{"incident_id":{"type":"string","description":"ThreatForge incident ID"}},"required":["incident_id"]}},
    {"name":"get_investigation","description":"Generate an evidence-based investigation package and BLUF for a ThreatForge incident, including recommended response actions.","inputSchema":{"type":"object","properties":{"incident_id":{"type":"string","description":"ThreatForge incident ID"}},"required":["incident_id"]}},
    {"name":"search_indicator","description":"Search ThreatForge telemetry for an IP, domain, URL or file hash and return reputation, associated incidents and MITRE techniques.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Indicator to search"}},"required":["query"]}},
    {"name":"get_mitre_coverage","description":"Retrieve current MITRE ATT&CK technique coverage observed by ThreatForge.","inputSchema":{"type":"object","properties":{}}},
]

def http_json(path: str):
    req = urllib.request.Request(BASE + path, headers={"Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode("utf-8"))

def call_tool(name, args):
    if name == "get_incident":
        return http_json("/incidents/" + urllib.parse.quote(args["incident_id"], safe=""))
    if name == "get_correlated_alerts":
        incident = http_json("/incidents/" + urllib.parse.quote(args["incident_id"], safe=""))
        alerts = http_json("/alerts")
        return {"incidentId": args["incident_id"], "alerts":[a for a in alerts if a.get("correlationId") == args["incident_id"]], "incident":incident}
    if name == "get_investigation":
        return http_json("/investigations/" + urllib.parse.quote(args["incident_id"], safe=""))
    if name == "search_indicator":
        return http_json("/threat-intelligence/search?" + urllib.parse.urlencode({"q":args["query"]}))
    if name == "get_mitre_coverage":
        return http_json("/mitre/coverage")
    raise ValueError(f"Unknown tool: {name}")

def respond(msg):
    method = msg.get("method")
    rid = msg.get("id")
    if method == "initialize":
        return {"jsonrpc":"2.0","id":rid,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"threatforge-mcp","version":"1.0.0"}}}
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc":"2.0","id":rid,"result":{"tools":TOOLS}}
    if method == "tools/call":
        try:
            result = call_tool(msg.get("params",{}).get("name"), msg.get("params",{}).get("arguments",{}))
            return {"jsonrpc":"2.0","id":rid,"result":{"content":[{"type":"text","text":json.dumps(result, indent=2)}],"isError":False}}
        except Exception as exc:
            return {"jsonrpc":"2.0","id":rid,"result":{"content":[{"type":"text","text":f"ThreatForge MCP error: {exc}"}],"isError":True}}
    if rid is not None:
        return {"jsonrpc":"2.0","id":rid,"error":{"code":-32601,"message":f"Method not found: {method}"}}
    return None

for line in sys.stdin:
    line=line.strip()
    if not line: continue
    try:
        msg=json.loads(line)
        out=respond(msg)
        if out is not None:
            sys.stdout.write(json.dumps(out,separators=(",",":"))+"\n")
            sys.stdout.flush()
    except Exception as exc:
        sys.stdout.write(json.dumps({"jsonrpc":"2.0","id":None,"error":{"code":-32700,"message":str(exc)}})+"\n")
        sys.stdout.flush()
