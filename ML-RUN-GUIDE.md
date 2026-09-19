# ThreatLens ML — XGBoost Training Guide

## Dataset used

The model is trained from the two supplied ThreatForge CSV files:

- `src/backend/ml/data/ThreatForge_XGBoost_Session_Dataset_15000.csv` — 15,000 session records.
- `src/backend/ml/data/ThreatForge_Event_Log_Dataset_80000.csv` — 80,000 raw event records aggregated by `session_id`.

The session dataset has the target `label` with three classes: `FP`, `TP`, and `Needs Investigation`. The event file is used for additional session-level features. `session_id` and `user_id` are not model features.

The dataset README specifically recommends splitting before preprocessing and grouping by `user_id`; this implementation follows that guidance. fileciteturn0file0L17-L24

## Train / validate / test

- 70% train
- 15% validation
- 15% final test
- `GroupShuffleSplit` by `user_id`
- The test users are completely separate from train/validation users.
- The final model is refit on train + validation after hyperparameter selection; the test set is only used for the final evaluation.

## Train manually

```powershell
cd src/backend
python ml/train_xgboost.py
```

The pre-trained model is already included:

- `src/backend/ml/threat_model.joblib`
- `src/backend/ml/model_metrics.json`

## Backend

```powershell
cd src/backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

## Frontend

```powershell
cd src/frontend
npm install
npm run dev
```

## Model API

Open:

`http://localhost:8000/api/v1/ml/model-info`

The runtime model maps the dataset labels to the application's classifications:

- `FP` → `LIKELY_FALSE_POSITIVE`
- `Needs Investigation` → `INVESTIGATING`
- `TP` → `GENUINE_THREAT`

The existing evidence-based correlation layer remains separate from ML classification.
