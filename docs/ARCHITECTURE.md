# ThreatLens submission architecture

## End-to-end path

1. **Ingest** — raw SIEM, EDR, network and threat-intel records enter the `RawFeed` interface.
2. **Normalize** — `normalizeFeed()` maps different field names into the common `Alert` schema while retaining the original JSON in `rawEvent`.
3. **Correlate** — `correlateAlerts()` looks for shared IP/host/entity, a 15-minute temporal window and MITRE technique overlap.
4. **Prioritise** — severity, cross-source corroboration, evidence volume and technique coverage contribute to an explainable threat score.
5. **MITRE** — `mapMitre()` maps observable behaviours to ATT&CK technique IDs.
6. **Incident** — correlated alerts become a single investigation object with timeline, assets, confidence and rationale.
7. **Bob** — the investigation UI uses the incident context to answer analyst questions and explain the score/attack chain.
8. **BLUF** — newly created incidents automatically receive a structured executive report.

## Demo safety

All inputs are synthetic. No real offensive action is performed. The simulator only creates benign test telemetry inside the application state.

## Extension point

Replace the demo `ingest()` caller with SIEM webhooks, EDR APIs, STIX/TAXII feeds or message queues. Replace the deterministic Bob response with a secured server-side LLM call. The UI contracts do not need to change.
