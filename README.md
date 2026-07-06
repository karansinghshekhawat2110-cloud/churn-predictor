# 🔮 Customer Churn Predictor

![ML](https://img.shields.io/badge/ML-Random%20Forest%20%2B%20XGBoost-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)
![Explainability](https://img.shields.io/badge/Explainability-SHAP-orange)
![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-brightgreen)

A production-style full-stack machine learning app that predicts telecom customer churn and explains each prediction with SHAP-based feature attributions.

🌐 **Live App**: [https://churn-predictor-phi.vercel.app](https://churn-predictor-phi.vercel.app)  
⚡ **API Docs**: [https://churn-predictor-api-zigm.onrender.com/docs](https://churn-predictor-api-zigm.onrender.com/docs)

---

## ✨ Features

- **Single-customer churn prediction** via a clean prediction workflow
- **Batch churn prediction (CSV upload)** with row-wise scoring
- **SHAP explainability** integrated in predictions for transparent model decisions
- **Human-readable churn reasons** generated from top influencing features
- **Risk segmentation** into `Low`, `Medium`, and `High`
- **Model metrics dashboard endpoint** exposing ROC, PR, confusion matrix, and importance summaries
- **Operational stats endpoint** tracking total/single/batch prediction usage
- **AI-powered retention strategy generation** (Groq-backed, environment-variable controlled)
- **Robust preprocessing + feature engineering pipeline** aligned with training artifacts
- **Artifact-based startup loading** for low-latency inference in production
- **Frontend + backend deployment split** (Vercel for UI, Render for API)

---

## 🧠 ML Pipeline Summary

- **Dataset**: IBM Telco Customer Churn (7,043 rows, 21 base features)
- **Class balance**: ~26.5% churn (imbalanced)
- **Preprocessing**:
  - Yes/No binary encoding
  - categorical mapping + one-hot for selected fields
  - `RobustScaler` for outlier-resistant scaling
- **Feature engineering**: 8 domain-inspired derived features
- **Models explored**: Random Forest + XGBoost (with tuning)
- **Selected model**: Tuned Random Forest bundle with persisted threshold
- **Explainability**: SHAP `TreeExplainer` (fast for tree models)

### Engineered Features

- `tenure_monthly_ratio`
- `is_long_term_contract`
- `service_count`
- `avg_monthly_per_service`
- `is_senior_alone`
- `is_fiber_high_bill`
- `no_support_services`
- `contract_tenure_interact`

---

## 🏗️ Repository Structure

```text
churn-predictor/
├── api/
│   ├── main.py                    # FastAPI service (prediction + metrics + strategy)
│   └── requirements.txt
├── data/
│   ├── raw/                       # Raw dataset snapshots
│   └── processed/                 # Processed/intermediate datasets
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── model/
│   ├── artifacts/                 # Trained model, preprocessors, SHAP explainer, test arrays
│   └── feature_engineering.py
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_preprocessing.ipynb
│   ├── 03_feature_engineering.ipynb
│   ├── 04_training.ipynb
│   └── 05_shap.ipynb
├── test_batch.csv                 # Sample batch scoring file
└── README.md
```

---

## 🔌 API Endpoints

Base URL (local): `http://127.0.0.1:8000`

### 1) `GET /health`
Service heartbeat + loaded model metadata.

### 2) `GET /stats`
Operational counters:
- `total_predictions`
- `single_predictions`
- `batch_rows_processed`
- `model_roc_auc`

### 3) `POST /predict`
Predict churn for one customer record.

**Returns:**
- churn probability
- boolean churn prediction (thresholded)
- risk level
- model name + threshold
- top SHAP reasons
- human-readable reason strings

### 4) `POST /predict_batch`
Upload CSV and score all rows in one call.

**Returns:**
- total processed
- high-risk count
- per-row probability, prediction, risk level
- top 2 SHAP reasons per row

### 5) `GET /model_metrics`
Returns precomputed evaluation package:
- sampled ROC curve points
- sampled PR curve points
- confusion matrix
- top SHAP feature importances
- summary (`roc_auc`, `pr_auc`, `f1`, `precision`, `recall`, `threshold`)

### 6) `POST /generate_strategy`
Generates personalized retention strategy text from customer profile + top drivers.

> Requires `GROQ_API_KEY` in environment; otherwise returns a safe warning message.

---

## 🚀 Run Locally

### 1) Clone

```bash
git clone https://github.com/ArjunKalirana/churn-predictor.git
cd churn-predictor
git checkout feature/arjun-branch
```

### 2) Backend (FastAPI)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r api/requirements.txt
uvicorn api.main:app --reload
```

Backend will run at: `http://127.0.0.1:8000`  
Swagger docs: `http://127.0.0.1:8000/docs`

### 3) Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

---

## 🧪 Batch Prediction Input Format

For `POST /predict_batch`, provide a CSV with customer columns matching training schema.

- Optional identifier columns like `customerID` / `CustomerID` are supported.
- Columns containing ID-like names and `Churn` are dropped before inference.
- Use the provided `test_batch.csv` as a reference template.

---

## 📊 Key Design Choices

- **Startup artifact loading** to avoid repeated disk I/O per request
- **Shared preprocessing logic** for single and batch inference to prevent train/serve drift
- **Thresholded classification** using persisted optimal threshold (not hardcoded 0.5)
- **Vectorized batch pipeline** for performant CSV scoring
- **SHAP-first explainability** surfaced directly in API responses
- **Graceful fallback behavior** for missing AI strategy credentials

---

## 🧰 Tech Stack

**ML / Data**: `pandas`, `numpy`, `scikit-learn`, `xgboost`, `shap`  
**Backend**: `FastAPI`, `Pydantic`, `Uvicorn`, `httpx`  
**Frontend**: `React`, `Vite`, `Axios`, `Recharts`, `Framer Motion`, `lucide-react`, `react-hot-toast`  
**Deployment**: Vercel (frontend), Render (backend)

---

## 🔐 Environment Variables

Backend optional variable:

```bash
GROQ_API_KEY=your_api_key_here
```

If not set, `/generate_strategy` returns an informative warning instead of failing the app.

---

## 🛠️ Development Notes

- Model artifacts are expected under `model/artifacts/`.
- `api/main.py` appends project root to `sys.path` to import model utilities.
- Notebook workflow is sequential (`01` → `05`) and aligned with productionized API flow.

---

## 👥 Authors

- **Karan Singh Shekhawat** — Original project author  
  [GitHub](https://github.com/karansinghshekhawat2110-cloud)
- **Arjun Kalirana** — Co-author (feature enhancements, branch updates, and project evolution)  
  [GitHub](https://github.com/ArjunKalirana)
