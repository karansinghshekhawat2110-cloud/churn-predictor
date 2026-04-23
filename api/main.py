"""
api/main.py — FastAPI backend for Customer Churn Prediction

Why FastAPI?
- Auto-generates /docs (Swagger UI) — great for interviews & demos
- Pydantic validation = type-safe inputs before any ML runs
- Async-ready, production-grade, used at Uber/Microsoft/Netflix
"""

import sys
import os

# Add project root to path so we can import model/feature_engineering.py
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pickle
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List

from model.feature_engineering import engineer_features  # our custom FE function

# ─────────────────────────────────────────────────────────
# 1. App Initialization
# ─────────────────────────────────────────────────────────

app = FastAPI(
    title="Churn Predictor API",
    description="Predicts telecom customer churn with SHAP-based explanations.",
    version="1.0.0",
)

# CORS: allow React dev server (Vite=5173, CRA=3000) and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://churn-predictor-phi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# 2. Load Artifacts at Startup (NOT per request)
#
# Why at startup?
# Loading pickle files takes ~200-500ms each.
# Doing it per-request would make every prediction slow.
# FastAPI runs this once when the server boots.
# ─────────────────────────────────────────────────────────

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "model", "artifacts")


def load_artifact(filename: str):
    """Load a pickle artifact from the artifacts directory."""
    path = os.path.join(ARTIFACTS_DIR, filename)
    with open(path, "rb") as f:
        return pickle.load(f)


# Load all artifacts
model_bundle    = load_artifact("churn_model.pkl")         # dict: model + threshold + metadata
preprocessor    = load_artifact("preprocessor_fe.pkl")     # RobustScaler fitted on training data
feature_columns = load_artifact("feature_columns_fe.pkl")  # exact 31-col order
explainer       = load_artifact("shap_explainer.pkl")      # TreeExplainer for SHAP values

# Unpack the model bundle
MODEL        = model_bundle["model"]
THRESHOLD    = model_bundle["optimal_threshold"]  # tuned for max F1, not default 0.5
MODEL_NAME   = model_bundle["model_name"]
TEST_ROC_AUC = model_bundle["test_roc_auc"]
PR_AUC       = model_bundle["pr_auc"]

print(f"✅ Loaded model    : {MODEL_NAME}")
print(f"✅ Threshold       : {THRESHOLD:.4f}")
print(f"✅ Test ROC-AUC    : {TEST_ROC_AUC:.4f}")
print(f"✅ PR-AUC          : {PR_AUC:.4f}")
print(f"✅ Feature columns : {len(feature_columns)} cols")

# ─────────────────────────────────────────────────────────
# 3. Request Schema (Pydantic)
#
# Why Pydantic?
# - Validates types before ML code even runs
# - Auto-generates API docs at /docs
# - Raises clean 422 errors for bad input (not cryptic ML errors)
# ─────────────────────────────────────────────────────────

class CustomerData(BaseModel):
    gender: str             = Field(..., example="Male")
    SeniorCitizen: int      = Field(..., ge=0, le=1, example=0)
    Partner: str            = Field(..., example="Yes")
    Dependents: str         = Field(..., example="No")
    tenure: int             = Field(..., ge=0, le=72, example=12)
    PhoneService: str       = Field(..., example="Yes")
    MultipleLines: str      = Field(..., example="No")
    InternetService: str    = Field(..., example="Fiber optic")
    OnlineSecurity: str     = Field(..., example="No")
    OnlineBackup: str       = Field(..., example="No")
    DeviceProtection: str   = Field(..., example="No")
    TechSupport: str        = Field(..., example="No")
    StreamingTV: str        = Field(..., example="Yes")
    StreamingMovies: str    = Field(..., example="Yes")
    Contract: str           = Field(..., example="Month-to-month")
    PaperlessBilling: str   = Field(..., example="Yes")
    PaymentMethod: str      = Field(..., example="Electronic check")
    MonthlyCharges: float   = Field(..., ge=0, example=85.5)

    # Normalize casing so "yes", "YES", "Yes" all work
    @validator(
        'Partner', 'Dependents', 'PhoneService', 'PaperlessBilling',
        'OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
        'TechSupport', 'StreamingTV', 'StreamingMovies', pre=True
    )
    def title_case_yesno(cls, v):
        return str(v).strip().title()

    @validator('gender', pre=True)
    def title_case_gender(cls, v):
        return str(v).strip().title()

    @validator('InternetService', 'Contract', 'PaymentMethod', 'MultipleLines', pre=True)
    def strip_whitespace(cls, v):
        return str(v).strip()
    
    
    # ─────────────────────────────────────────────────────────
# 4. Preprocessing Helper
#
# Replicates the EXACT pipeline from notebooks 02 & 03.
# Raw JSON input → clean 31-col DataFrame ready for model.
# ─────────────────────────────────────────────────────────

def preprocess_input(data: CustomerData) -> pd.DataFrame:
    raw = pd.DataFrame([data.dict()])

    # Binary encode Yes/No columns (same as notebook 02)
    binary_cols = [
        'Partner', 'Dependents', 'PhoneService', 'PaperlessBilling',
        'OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
        'TechSupport', 'StreamingTV', 'StreamingMovies'
    ]
    for col in binary_cols:
        raw[col] = (raw[col] == 'Yes').astype(int)

    # MultipleLines has 3 values — "No phone service" and "No" both → 0
    raw['MultipleLines'] = (raw['MultipleLines'] == 'Yes').astype(int)

    # Gender: Male=1, Female=0
    raw['gender'] = (raw['gender'] == 'Male').astype(int)

    # Contract is ordinal — order matters for the model
    contract_map = {'Month-to-month': 0, 'One year': 1, 'Two year': 2}
    raw['Contract'] = raw['Contract'].map(contract_map).fillna(0).astype(int)

# Manually create OHE columns — guarantees exact column names
    # pd.get_dummies was producing 'InternetService_0' instead of 'InternetService_DSL'
    internet = raw['InternetService'].iloc[0]
    raw['InternetService_DSL']         = int(internet == 'DSL')
    raw['InternetService_Fiber optic'] = int(internet == 'Fiber optic')
    raw['InternetService_0']           = int(internet == 'No')
    

    payment = raw['PaymentMethod'].iloc[0]
    raw['PaymentMethod_Bank transfer (automatic)'] = int(payment == 'Bank transfer (automatic)')
    raw['PaymentMethod_Credit card (automatic)']   = int(payment == 'Credit card (automatic)')
    raw['PaymentMethod_Electronic check']          = int(payment == 'Electronic check')
    raw['PaymentMethod_Mailed check']              = int(payment == 'Mailed check')

    raw.drop(columns=['InternetService', 'PaymentMethod'], inplace=True)

    # Add 8 engineered features (same function used during training)
    
    raw = engineer_features(raw)

    # Align to exact 31-col order used during training — critical, model breaks without this
    raw = raw[feature_columns]

    # Apply RobustScaler (fitted on training data, loaded from artifact)
    raw_scaled = preprocessor.transform(raw)

    return raw_scaled

# ─────────────────────────────────────────────────────────
# 5. Response Schema
#
# Defines exactly what /predict returns.
# Typed responses = auto-documented in /docs.
# ─────────────────────────────────────────────────────────

class ShapReason(BaseModel):
    feature: str    # e.g. "tenure"
    effect: float   # positive = pushes toward churn, negative = pushes away
    direction: str  # "increases risk" or "decreases risk"

class PredictionResponse(BaseModel):
    churn_probability: float   # raw probability 0.0 - 1.0
    churn_prediction: bool     # True/False based on tuned threshold
    risk_level: str            # "Low" / "Medium" / "High"
    threshold_used: float      # so frontend can show it
    model_used: str            # XGBoost or RandomForest
    top_reasons: List[ShapReason]  # top 5 SHAP drivers


# ─────────────────────────────────────────────────────────
# 6. Risk Level Helper
#
# Bucketing probability into human-readable risk.
# Thresholds chosen to match business intuition:
# <30% = safe, 30-60% = watch, >60% = act now
# ─────────────────────────────────────────────────────────

def get_risk_level(probability: float) -> str:
    if probability >= 0.60:
        return "High"
    elif probability >= 0.30:
        return "Medium"
    else:
        return "Low"


# ─────────────────────────────────────────────────────────
# 7. Endpoints
# ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Quick check that the API is alive and model is loaded."""
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "test_roc_auc": round(TEST_ROC_AUC, 4),
        "pr_auc": round(PR_AUC, 4),
        "threshold": round(THRESHOLD, 4),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerData):
    """
    Accepts raw customer data, runs full pipeline, returns churn prediction + SHAP reasons.
    """
    try:
        # Step 1: preprocess raw input → scaled 31-col array
        X = preprocess_input(customer)

        # Step 2: get churn probability (column 1 = churn class)
        probability = float(MODEL.predict_proba(X)[0][1])

        # Step 3: apply tuned threshold (not default 0.5)
        prediction = probability >= THRESHOLD

        # Step 4: compute SHAP values for this single prediction
        shap_values = explainer.shap_values(X)

        # Handle shape: TreeExplainer returns (n, features, 2) for classifiers
        # We want churn class (index 1) for a single row
        if isinstance(shap_values, list):
            sv = shap_values[1][0]   # list format: [class0, class1]
        elif shap_values.ndim == 3:
            sv = shap_values[0, :, 1]  # array format: (1, features, 2)
        else:
            sv = shap_values[0]       # already (1, features)

        # Step 5: pick top 5 features by absolute SHAP value
        indices = np.argsort(np.abs(sv))[::-1][:5]
        top_reasons = [
            ShapReason(
                feature=feature_columns[i],
                effect=round(float(sv[i]), 4),
                direction="increases risk" if sv[i] > 0 else "decreases risk"
            )
            for i in indices
        ]

        return PredictionResponse(
            churn_probability=round(probability, 4),
            churn_prediction=bool(prediction),
            risk_level=get_risk_level(probability),
            threshold_used=round(THRESHOLD, 4),
            model_used=MODEL_NAME,
            top_reasons=top_reasons,
        )

    except Exception as e:
        # Raise HTTP 500 with the actual error — useful during development
        raise HTTPException(status_code=500, detail=str(e))
    
  
    
