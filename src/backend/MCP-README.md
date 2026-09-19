# ThreatLens MCP for IBM Bob

ThreatLens exposes a read-only local MCP server for IBM Bob. Bob can query real
correlated incidents, their alerts, MITRE coverage, indicators and the
Evidence-first BLUF investigation package.

## Run

Start the ThreatLens API first:

```powershell
uvicorn app.main:app --reload --port 8000
```

The project-level `.bob/mcp.json` registers `src/backend/mcp_server.py` over
STDIO. In IBM Bob, enable MCP servers and reload the workspace. Bob can then
use the `threatlens` tools.

Example prompt in Bob:

> Investigate INC-001 using the ThreatLens incident, correlated alerts, MITRE
> coverage and investigation tools. Explain the evidence, assess whether this
> is a genuine threat, and produce a concise commander BLUF with actions.

The server is read-only and performs no containment or destructive actions.
