"""
Train the ThreatForge XGBoost session classifier.

Inputs:
  ml/data/ThreatForge_XGBoost_Session_Dataset_15000.csv
  ml/data/ThreatForge_Event_Log_Dataset_80000.csv

Outputs:
  ml/threat_model.joblib
  ml/model_metrics.json

Important:
- session_id and user_id are excluded from features.
- Event logs are aggregated by session_id.
- Splits are grouped by user_id (70/15/15).
- The test set is never used for model selection.
"""
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix, classification_report
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parent
SESSION = BASE / "data" / "ThreatForge_XGBoost_Session_Dataset_15000.csv"
EVENTS = BASE / "data" / "ThreatForge_Event_Log_Dataset_80000.csv"
MODEL_FILE = BASE / "threat_model.joblib"
META_FILE = BASE / "model_metrics.json"

LABELS = ["FP", "Needs Investigation", "TP"]
LABEL_TO_ID = {x:i for i,x in enumerate(LABELS)}

sess = pd.read_csv(SESSION)
ev = pd.read_csv(EVENTS, parse_dates=["timestamp"])
ev["timestamp"] = pd.to_datetime(ev["timestamp"], errors="coerce")

g = ev.groupby("session_id")
event_feat = g.agg(
    event_rows=("event_id","count"),
    event_type_nunique=("event_type","nunique"),
    event_source_nunique=("source","nunique"),
    event_location_nunique=("location","nunique"),
    event_known_ip_mean=("known_ip","mean"),
    event_known_device_mean=("known_device","mean"),
    event_threat_indicator_sum=("threat_indicator","sum"),
    event_mitre_nunique=("mitre_technique","nunique"),
    event_user_role_nunique=("user_role","nunique"),
).reset_index()
span = g["timestamp"].agg(
    lambda s: (s.max()-s.min()).total_seconds()/60 if s.notna().any() else 0
).rename("event_time_span_min").reset_index()
event_feat = event_feat.merge(span, on="session_id", how="left")

etype = pd.crosstab(ev["session_id"], ev["event_type"]).reset_index()
etype.columns = ["session_id"] + [f"evt_type__{str(c)}" for c in etype.columns[1:]]
event_feat = event_feat.merge(etype, on="session_id", how="left")

data = sess.merge(event_feat, on="session_id", how="left")
X = data.drop(columns=["label","session_id","user_id"]).copy()
y = data["label"].map(LABEL_TO_ID).values
groups = data["user_id"].values

cat = X.select_dtypes(include=["object"]).columns.tolist()
num = [c for c in X.columns if c not in cat]
X[num] = X[num].replace([np.inf,-np.inf],np.nan).fillna(0)
X[cat] = X[cat].fillna("UNKNOWN").astype(str)

# 70/15/15 grouped split. Users never cross a split.
gss = GroupShuffleSplit(n_splits=1, test_size=.30, random_state=42)
tr, tmp = next(gss.split(X, y, groups=groups))
gss2 = GroupShuffleSplit(n_splits=1, test_size=.50, random_state=43)
va_rel, te_rel = next(gss2.split(X.iloc[tmp], y[tmp], groups=groups[tmp]))
va, te = tmp[va_rel], tmp[te_rel]

enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
Xtr, Xva, Xte = X.iloc[tr].copy(), X.iloc[va].copy(), X.iloc[te].copy()
Xtr[cat] = enc.fit_transform(Xtr[cat])
Xva[cat] = enc.transform(Xva[cat])
Xte[cat] = enc.transform(Xte[cat])

candidates = [
    dict(n_estimators=350,max_depth=4,learning_rate=.035,min_child_weight=4,subsample=.82,colsample_bytree=.82,reg_alpha=.25,reg_lambda=3.0),
    dict(n_estimators=450,max_depth=5,learning_rate=.03,min_child_weight=5,subsample=.80,colsample_bytree=.80,reg_alpha=.40,reg_lambda=4.0),
    dict(n_estimators=300,max_depth=3,learning_rate=.045,min_child_weight=4,subsample=.85,colsample_bytree=.85,reg_alpha=.30,reg_lambda=3.0),
]

best_f1, best_params = -1, None
for params in candidates:
    model = XGBClassifier(
        objective="multi:softprob", num_class=3, eval_metric="mlogloss",
        tree_method="hist", random_state=42, n_jobs=-1, verbosity=0, **params
    )
    model.fit(Xtr, y[tr], eval_set=[(Xva,y[va])], verbose=False)
    score = f1_score(y[va], model.predict(Xva), average="macro")
    if score > best_f1:
        best_f1, best_params = float(score), params

# Refit the selected configuration on train+validation; test remains untouched.
fit = np.concatenate([tr,va])
Xfit = X.iloc[fit].copy()
Xtest = X.iloc[te].copy()
enc_final = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
Xfit[cat] = enc_final.fit_transform(Xfit[cat])
Xtest[cat] = enc_final.transform(Xtest[cat])

model = XGBClassifier(
    objective="multi:softprob", num_class=3, eval_metric="mlogloss",
    tree_method="hist", random_state=42, n_jobs=-1, verbosity=0, **best_params
)
model.fit(Xfit, y[fit], eval_set=[(Xtest,y[te])], verbose=False)

pred_train = model.predict(Xfit)
pred_test = model.predict(Xtest)
test_f1 = f1_score(y[te], pred_test, average="macro")
metrics = {
    "model":"XGBClassifier","algorithm":"XGBoost","task":"3-class session classification",
    "classes":LABELS,
    "training_samples":int(len(fit)), "validation_samples":int(len(va)), "test_samples":int(len(te)),
    "unique_users_train":int(len(set(groups[fit]))),
    "unique_users_validation":int(len(set(groups[va]))),
    "unique_users_test":int(len(set(groups[te]))),
    "split":"GroupShuffleSplit by user_id; 70/15/15; test untouched until final evaluation",
    "feature_count":int(X.shape[1]), "categorical_features":cat,
    "event_enriched":True,
    "hyperparameters":best_params,
    "validation_macro_f1":best_f1,
    "test_accuracy":float(accuracy_score(y[te],pred_test)),
    "test_macro_f1":float(test_f1),
    "test_weighted_f1":float(f1_score(y[te],pred_test,average="weighted")),
    "test_macro_precision":float(precision_score(y[te],pred_test,average="macro")),
    "test_macro_recall":float(recall_score(y[te],pred_test,average="macro")),
    "train_macro_f1":float(f1_score(y[fit],pred_train,average="macro")),
    "generalization_gap":float(f1_score(y[fit],pred_train,average="macro")-test_f1),
    "confusion_matrix":confusion_matrix(y[te],pred_test).tolist(),
    "classification_report":classification_report(y[te],pred_test,target_names=LABELS,output_dict=True),
}

joblib.dump({
    "model":model, "encoder":enc_final, "feature_names":X.columns.tolist(),
    "categorical_features":cat, "numeric_features":[c for c in X.columns if c not in cat],
    "label_mapping":LABEL_TO_ID, "labels":LABELS, "training_seed":42,
}, MODEL_FILE)
META_FILE.write_text(json.dumps(metrics,indent=2),encoding="utf-8")
print(json.dumps(metrics,indent=2))
