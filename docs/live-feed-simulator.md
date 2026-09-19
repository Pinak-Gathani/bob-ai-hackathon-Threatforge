# Live Threat Feed Simulator

ThreatForge includes a live-feed simulator for demos when no external SIEM/EDR connection is available. The dashboard calls `POST /api/v1/demo/live-tick` every six seconds while Live is ON. Each tick generates heterogeneous events from SIEM, EDR, Network Sensor and Threat Intel and sends them through the same normalization, per-alert ML inference, correlation and persistence pipeline used by normal ingestion.

The simulator generates both malicious-looking and benign operational activity. Every incoming alert receives a XGBoost threat probability, classification and priority before correlation.

This is simulated live data, not a real SIEM connection. A real connector can later call the existing `/api/v1/alerts/ingest` endpoint without changing the ML inference pipeline.
