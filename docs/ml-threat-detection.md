# ML Threat Detection

ThreatForge uses a new XGBoost session classifier trained from the supplied ThreatForge datasets.

## What the model predicts

The training target is the dataset's three-class `label`:

- `FP`
- `Needs Investigation`
- `TP`

At runtime these are mapped to the application's existing classifications:

- `FP` → `LIKELY_FALSE_POSITIVE`
- `Needs Investigation` → `INVESTIGATING`
- `TP` → `GENUINE_THREAT`

The API also exposes class probabilities, an advisory threat probability, confidence, and an ML priority.

## Training data

The model uses the 15,000-row session dataset as the primary training table and aggregates the 80,000-row event dataset by `session_id` for additional session-level features.

`session_id` and `user_id` are excluded from model features. The supplied dataset README recommends a grouped split by `user_id` because users repeat across sessions; the training implementation follows that recommendation. fileciteturn0file0L17-L24

## Evaluation

The model uses grouped 70/15/15 train/validation/test splits. Hyperparameters are selected using the validation set. The final model is then refit on train + validation and evaluated once on the untouched test set.

Current artifact metrics are stored in `src/backend/ml/model_metrics.json`.

## Runtime architecture

`raw feeds -> normalization -> XGBoost session classification -> correlation/evidence -> incident -> MITRE/BLUF`

The deterministic correlation engine remains a separate evidence-fusion component. The XGBoost output is an ML advisory signal and is not the sole incident decision gate.
