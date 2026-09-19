# Problem Statement

## Context

Security operations teams receive large volumes of alerts from multiple security sources. Alerts may describe the same underlying activity using different fields, identifiers, severities, timestamps, and terminology.

## Core Problem

Analysts must manually:

1. Normalise alerts from different sources.
2. Determine which alerts are related.
3. Separate genuine threats from false positives and isolated noise.
4. Prioritise incidents that require immediate attention.
5. Understand the adversary behaviour through MITRE ATT&CK techniques.
6. Build an evidence-backed investigation summary for decision makers.

This manual correlation process increases analyst workload and can delay response to genuinely important activity.

## Target Users

The primary users are:

- SOC analysts
- Security operations teams
- Threat intelligence analysts
- Incident responders
- Security managers who need concise incident summaries

## Hackathon Problem Alignment

ThreatForge addresses the problem of **Threat Intelligence Correlation & Alert Prioritisation** by converting multi-source security alerts into correlated, prioritised incidents and investigation-ready summaries.

The demonstration uses realistic simulated security data, allowing the complete workflow to be evaluated without requiring classified or proprietary feeds.

## Desired Outcome

The system should help an analyst move from a noisy alert stream to:

**Related evidence → Correlated incident → Priority → MITRE context → Investigation → BLUF → Recommended action**

The goal is not to replace analyst judgement, but to reduce repetitive correlation work and make the most important evidence easier to understand.
