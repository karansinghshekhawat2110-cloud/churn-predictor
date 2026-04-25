# 🔮 Customer Churn Predictor

![ML](https://img.shields.io/badge/ML-XGBoost%20%7C%20Random%20Forest-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)
![Deployed](https://img.shields.io/badge/Deployed-Render%20%2B%20Vercel-brightgreen)

A full-stack machine learning web app that predicts whether a telecom customer will churn, with **SHAP-based explanations** for every prediction.

🌐 **Live Demo**: [churn-predictor-phi.vercel.app](https://churn-predictor-phi.vercel.app)  
⚡ **API Docs**: [churn-predictor-api-zigm.onrender.com/docs](https://churn-predictor-api-zigm.onrender.com/docs)

---

## 📸 Screenshot

![alt text](image.png)

---

## 🧠 ML Pipeline

| Step | Details |
|------|---------|
| Dataset | IBM Telco Customer Churn (7043 rows, 21 features) |
| Churn Rate | 26.54% (imbalanced) |
| Preprocessing | RobustScaler, binary encoding, one-hot encoding |
| Feature Engineering | 8 custom features (tenure ratio, service count, etc.) |
| Models | Random Forest + XGBoost (GridSearchCV tuned) |
| Evaluation | StratifiedKFold(5), ROC-AUC, PR-AUC |
| Explainability | SHAP TreeExplainer |

**Best Model**: Random Forest (Tuned)  
**Test ROC-AUC**: 0.8383  
**PR-AUC**: 0.6395  
**Threshold**: 0.55 (tuned for max F1)

---

## 🏗️ Project Structure

churn-predictor/
├── api/
│   ├── main.py              # FastAPI backend
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── CustomerForm.jsx
│           └── ResultCard.jsx
├── model/
│   ├── artifacts/           # Trained model + preprocessor
│   └── feature_engineering.py
└── notebooks/
├── 01_eda.ipynb
├── 02_preprocessing.ipynb
├── 03_feature_engineering.ipynb
├── 04_training.ipynb
└── 05_shap.ipynb



---

## 🚀 Tech Stack

**ML**: scikit-learn, XGBoost, SHAP, pandas, numpy  
**Backend**: FastAPI, uvicorn, pydantic  
**Frontend**: React, Vite, CSS3  
**Deployment**: Render (backend), Vercel (frontend)

---

## ⚙️ Run Locally

**Backend:**
```bash
# Create venv with Python 3.12
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r api/requirements.txt
cd api
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 💡 Key Design Decisions

- **Threshold tuning** — Default 0.5 threshold replaced with 0.55 tuned for max F1 on imbalanced data
- **RobustScaler** — Used over StandardScaler due to outliers in MonthlyCharges
- **scale_pos_weight** — Set to 2.77 for XGBoost to handle 26% churn rate imbalance
- **SHAP TreeExplainer** — Chosen over KernelExplainer for 100x speed on tree models
- **Artifacts loaded at startup** — Prevents 500ms delay on every prediction request

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + Enter` | Run Churn Prediction (Single mode) |
| `Escape` | Close Model Metrics / Panels |
| `⌘ + 1` | Switch to Prediction Engine |
| `⌘ + 2` | Switch to Batch Analysis |
| `⌘ + 3` | Switch to History Dashboard |

---

---

## 📊 Features Engineered

| Feature | Description |
|---------|-------------|
| `tenure_monthly_ratio` | Tenure relative to monthly bill |
| `is_long_term_contract` | Two year contract flag |
| `service_count` | Total number of active services |
| `avg_monthly_per_service` | Bill efficiency per service |
| `is_senior_alone` | Senior with no partner/dependents |
| `is_fiber_high_bill` | Fiber user with above-median bill |
| `no_support_services` | No security or tech support |
| `contract_tenure_interact` | Contract type × tenure interaction |

---

## 👤 Author

**Karan Singh Shekhawat**  
[GitHub](https://github.com/karansinghshekhawat2110-cloud)