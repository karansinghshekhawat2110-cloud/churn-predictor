"""
api/main.py — FastAPI backend for Customer Churn Prediction

Why FastAPI?
- Auto-generates /docs (Swagger UI) — great for interviews & demos
- Pydantic validation = type-safe inputs before any ML runs
- Async-ready, production-grade, used at Uber/Microsoft/Netflix
"""

import sys
import os
import io

# Add project root to path so we can import model/feature_engineering.py
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pickle
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException, File, UploadFile
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
        if pd.isna(v): return "No"
        return str(v).strip().title()

    @validator('gender', pre=True)
    def title_case_gender(cls, v):
        if pd.isna(v): return "Male"
        return str(v).strip().title()

    @validator('InternetService', 'Contract', 'PaymentMethod', 'MultipleLines', pre=True)
    def strip_whitespace(cls, v):
        if pd.isna(v): return ""
        return str(v).strip()

# ─────────────────────────────────────────────────────────
# 4. Preprocessing Helper (Vectorized for Bulk)
# ─────────────────────────────────────────────────────────

def preprocess_batch(raw: pd.DataFrame) -> np.ndarray:
    """Safely vectorizes preprocessing logic for 1 or N rows."""
    df = raw.copy()
    
    # Text cleanups for bulk CSV
    for col in ['Partner', 'Dependents', 'PhoneService', 'PaperlessBilling',
                'OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
                'TechSupport', 'StreamingTV', 'StreamingMovies']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.title()
            
    if 'gender' in df.columns:
        df['gender'] = df['gender'].astype(str).str.strip().str.title()
        
    for col in ['InternetService', 'Contract', 'PaymentMethod', 'MultipleLines']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Binary encode Yes/No columns
    binary_cols = [
        'Partner', 'Dependents', 'PhoneService', 'PaperlessBilling',
        'OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
        'TechSupport', 'StreamingTV', 'StreamingMovies'
    ]
    for col in binary_cols:
        if col in df.columns:
            df[col] = (df[col] == 'Yes').astype(int)

    # MultipleLines
    if 'MultipleLines' in df.columns:
        df['MultipleLines'] = (df['MultipleLines'] == 'Yes').astype(int)

    # Gender
    if 'gender' in df.columns:
        df['gender'] = (df['gender'] == 'Male').astype(int)

    # Contract
    contract_map = {'Month-to-month': 0, 'One year': 1, 'Two year': 2}
    if 'Contract' in df.columns:
        df['Contract'] = df['Contract'].map(contract_map).fillna(0).astype(int)

    # InternetService OHE mapped safely (Vectorized)
    if 'InternetService' in df.columns:
        internet = df['InternetService']
        df['InternetService_DSL']         = (internet == 'DSL').astype(int)
        df['InternetService_Fiber optic'] = (internet == 'Fiber optic').astype(int)
        df['InternetService_0']           = (internet == 'No').astype(int)

    # PaymentMethod OHE mapped safely
    if 'PaymentMethod' in df.columns:
        payment = df['PaymentMethod']
        df['PaymentMethod_Bank transfer (automatic)'] = (payment == 'Bank transfer (automatic)').astype(int)
        df['PaymentMethod_Credit card (automatic)']   = (payment == 'Credit card (automatic)').astype(int)
        df['PaymentMethod_Electronic check']          = (payment == 'Electronic check').astype(int)
        df['PaymentMethod_Mailed check']              = (payment == 'Mailed check').astype(int)

    df.drop(columns=['InternetService', 'PaymentMethod'], inplace=True, errors='ignore')

    # Add 8 engineered features
    df = engineer_features(df)

    # Align columns explicitly for scaling
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0

    df = df[feature_columns]
    
    # Scale
    raw_scaled = preprocessor.transform(df)
    return raw_scaled

def preprocess_input(data: CustomerData) -> np.ndarray:
    raw = pd.DataFrame([data.dict()])
    return preprocess_batch(raw)

# ─────────────────────────────────────────────────────────
# 5. Response Schema
# ─────────────────────────────────────────────────────────

class ShapReason(BaseModel):
    feature: str    # e.g. "tenure"
    effect: float   # positive = pushes toward churn, negative = pushes away
    direction: str  # "increases risk" or "decreases risk"

class PredictionResponse(BaseModel):
    churn_probability: float
    churn_prediction: bool
    risk_level: str
    threshold_used: float
    model_used: str
    top_reasons: List[ShapReason]

class BatchPredictionResult(BaseModel):
    customer_id: str
    churn_probability: float
    risk_level: str
    churn_prediction: bool
    top_reasons: List[ShapReason]

class BatchResponse(BaseModel):
    total_processed: int
    total_high_risk: int
    results: List[BatchPredictionResult]

# ─────────────────────────────────────────────────────────
# 6. Risk Level Helper
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
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "test_roc_auc": round(TEST_ROC_AUC, 4),
        "pr_auc": round(PR_AUC, 4),
        "threshold": round(THRESHOLD, 4),
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerData):
    try:
        X = preprocess_input(customer)
        probability = float(MODEL.predict_proba(X)[0][1])
        prediction = probability >= THRESHOLD
        
        shap_values = explainer.shap_values(X)
        if isinstance(shap_values, list): sv = shap_values[1][0]
        elif shap_values.ndim == 3: sv = shap_values[0, :, 1]
        else: sv = shap_values[0]

        indices = np.argsort(np.abs(sv))[::-1][:5]
        top_reasons = [
            ShapReason(
                feature=feature_columns[i],
                effect=round(float(sv[i]), 4),
                direction="increases risk" if sv[i] > 0 else "decreases risk"
            ) for i in indices
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_batch", response_model=BatchResponse)
async def predict_batch(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Resolve Customer IDs
        if "customerID" in df.columns:
            customer_ids = df["customerID"].astype(str).tolist()
        elif "CustomerID" in df.columns:
            customer_ids = df["CustomerID"].astype(str).tolist()
        else:
            customer_ids = [f"Row-{i+1}" for i in range(len(df))]
            
        drop_cols = [c for c in df.columns if "customer" in c.lower() or "id" in c.lower() or c.lower() == "churn"]
        df_clean = df.drop(columns=drop_cols, errors='ignore')
        
        # Vectorized process
        X = preprocess_batch(df_clean)
        
        # Vectorized inference
        probabilities = MODEL.predict_proba(X)[:, 1]
        predictions = probabilities >= THRESHOLD
        
        # Vectorized SHAP computation
        shap_values = explainer.shap_values(X)
        if isinstance(shap_values, list): sv = shap_values[1]
        elif shap_values.ndim == 3: sv = shap_values[:, :, 1]
        else: sv = shap_values
            
        results = []
        total_high = 0
        
        # Package Option B (Top 2 Insights per row)
        for i in range(len(df_clean)):
            prob = float(probabilities[i])
            pred = bool(predictions[i])
            risk = get_risk_level(prob)
            if risk == "High": total_high += 1
                
            row_sv = sv[i]
            # Top 2 reasons for batch to prevent overwhelming UI
            indices = np.argsort(np.abs(row_sv))[::-1][:2]
            top_reasons = [
                ShapReason(
                    feature=feature_columns[idx],
                    effect=round(float(row_sv[idx]), 4),
                    direction="increases risk" if row_sv[idx] > 0 else "decreases risk"
                ) for idx in indices
            ]
                
            results.append(BatchPredictionResult(
                customer_id=customer_ids[i],
                churn_probability=round(prob, 4),
                risk_level=risk,
                churn_prediction=pred,
                top_reasons=top_reasons
            ))
            
        return BatchResponse(
            total_processed=len(df),
            total_high_risk=total_high,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
