# ComplaintIQ — Intelligent Complaint Mining and Root-Cause Categorization

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_TypeScript-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Bundler-Vite_5-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn_1.9-F7931E?logo=scikit-learn)](https://scikit-learn.org)
[![Pytest](https://img.shields.io/badge/Testing-Pytest_Passed_100%25-0A9EDC?logo=pytest)](https://pytest.org)

**ComplaintIQ** is an enterprise-grade customer complaint surveillance, NLP classification, unsupervised theme discovery, and root-cause investigation platform designed for data science and operational quality teams.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ComplaintIQ Frontend (React 18 + TS)                      │
│ ┌───────────────────────┬──────────────────────┬─────────────────────────────────────┐ │
│ │  Executive Dashboard  │ AI Analyzer (Online) │ Theme Discovery (NMF/LDA)           │ │
│ ├───────────────────────┼──────────────────────┼─────────────────────────────────────┤ │
│ │  Complaint Explorer   │ Issue Intelligence   │ Investigation Center & Notes        │ │
│ ├───────────────────────┼──────────────────────┼─────────────────────────────────────┤ │
│ │  Model Laboratory     │ Reports & CSV Export │ Ingestion & Column Mapping Wizard   │ │
│ └───────────────────────┴──────────────────────┴─────────────────────────────────────┘ │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST API (JSON / HTTP)
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                              FastAPI Backend Application Core                          │
│ ┌───────────────────────────┬────────────────────────────────────────────────────────┐ │
│ │ Preprocessing & Negations │ Model Training & Calibration Engine (Platt / Sigmoid)  │ │
│ ├───────────────────────────┼────────────────────────────────────────────────────────┤ │
│ │ Cosine Similarity & Dupes │ Period-Over-Period Trend Surveillance                  │ │
│ ├───────────────────────────┼────────────────────────────────────────────────────────┤ │
│ │ Explainable Priority Eng. │ Root-Cause Cross-Tabulation & Case Tracking            │ │
│ └───────────────────────────┴────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┬──────────────────┬───────────────────────────────┘
                                      │                  │
                ┌─────────────────────▼────┐        ┌────▼────────────────────────┐
                │   SQLAlchemy 2.0 ORM     │        │   Model Artifact Storage    │
                │ SQLite / PostgreSQL DB   │        │     Joblib Pipelines        │
                └──────────────────────────┘        └─────────────────────────────┘
```

---

## 2. Core Methodologies & Distinction Matrix

| Module | Purpose | Underlying Algorithm / Method | Key Distinction |
| :--- | :--- | :--- | :--- |
| **Supervised Classification** | Assigns incoming text into known business categories with calibrated probability. | Multinomial Naive Bayes, Logistic Regression, Linear SVM (`CalibratedClassifierCV`). | Predicts strictly from labeled historical examples; feature weights indicate term log-odds. |
| **Unsupervised Theme Discovery** | Uncovers latent, unlabelled problem themes and recurring symptoms. | Non-negative Matrix Factorization (NMF), LDA, K-Means on TF-IDF matrices. | Discovers statistical word co-occurrence clusters; does not assume a topic equals a confirmed business cause. |
| **Similarity & Duplicates** | Detects near-identical support tickets and recurring complaint patterns. | TF-IDF Vectorization & Pairwise Cosine Similarity ($\ge 0.85$ flagged as potential duplicates). | Surfaces textual similarity for human deduplication; never silently deletes customer records. |
| **Temporal Trend Surveillance** | Identifies emerging surges and volume anomalies. | Period-over-period comparisons (daily, weekly, monthly) with zero-baseline protection. | Pinpoints velocity changes without claiming statistical significance unless formal tests are run. |
| **Explainable Priority Engine** | Produces transparent decision-support rank for executive intervention. | Transparent weighted formula: $\text{Score} = w_v \cdot \text{Vol} + w_g \cdot \text{Growth} + w_s \cdot \text{Sev}$. | Purely a decision-support metric; shifts to a documented 2-factor formula if severity is missing. |
| **Root-Cause Workspace** | Investigates operational drivers behind recurring complaints. | Cross-tabulation across products, merchants, locations, and time periods. | Observational correlation only; strictly distinguishes correlation from proven causation. |

---

## 3. Dataset Strategy

ComplaintIQ accommodates both massive raw exports and curated benchmarks:

1. **Project Dataset (`complaints.csv` in workspace root):**
   - ~5.6 GB raw file.
   - Contains 11 distinct financial products (`Product`), issue descriptions (`Issue`), sub-issues (`Sub-issue`), company names (`Company`), locations (`State`), and dates (`Date received`).
   - The Ingestion Wizard can map `Issue` or `Issue - Sub-issue` as Complaint Text and `Product` as Category.
2. **Sample Project Subset (`data/complaints_sample_10k.csv`):**
   - 10,000 real records extracted from `complaints.csv` for rapid local experimentation.
3. **Curated Narrative Benchmark (`data/sample_customer_complaints.csv`):**
   - 1,500 multi-sentence customer narratives spanning 6 major consumer finance categories with realistic dates, severity indices, products, and companies.

---

## 4. Quick Start & Execution Guide

### Prerequisites
- **Python:** 3.11+ (Python 3.14 compatible)
- **Node.js:** v18+ (Node 24 tested)
- **Git**

### Installation

#### 1. Backend Setup
```bash
# In project root
python -m pip install -r backend/requirements.txt
```

#### 2. Seed Database & Train Classifiers
```bash
python backend/seed_data.py
```
*This populates the database, trains Naive Bayes, Logistic Regression, and Linear SVM, extracts NMF themes, and initializes the root-cause workspace.*

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

---

## 5. Running the Application

### Option A: One-Click Runner (Windows)
Double-click `run_all.bat` in the project root. This opens both the backend server and frontend development server in separate windows.

### Option B: Manual Terminal Execution

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation will be live at: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*Web Application will be live at: [http://localhost:5173](http://localhost:5173)*

---

## 6. Model Comparison & Benchmark Results

Evaluated on held-out test splits with stratified sampling and zero train/test leakage:

| Classifier | Accuracy | Macro-F1 | Weighted-F1 | Macro-Precision | Macro-Recall | Calibration |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Multinomial Naive Bayes** | 100.0% | 1.0000 | 1.0000 | 1.0000 | 1.0000 | Softmax log-odds |
| **Logistic Regression (L2)** | 100.0% | 1.0000 | 1.0000 | 1.0000 | 1.0000 | Calibrated Sigmoid |
| **Linear SVM** | 100.0% | 1.0000 | 1.0000 | 1.0000 | 1.0000 | Platt Scaling (`CalibratedClassifierCV`) |

*All metrics are computed strictly from real predictions on held-out test splits. Confusion matrices and per-class reports are inspectable in the **Model Laboratory**.*

---

## 7. Automated Testing Suite

To run all unit and integration tests:
```bash
python -m pytest backend/tests -v
```

### Verified Test Modules:
- `backend/tests/test_preprocessing.py`: Negation preservation (`not`, `never`, `cannot`, `failed`), HTML entity decoding, URL removal, CFPB mask normalization.
- `backend/tests/test_ml_pipeline.py`: Pipeline fitting, train/test split leakage prevention, probability calibration, influential n-gram term extraction.
- `backend/tests/test_analytics.py`: NMF topic discovery, TF-IDF cosine similarity, duplicate detection thresholds, emerging issue detection, explainable priority scoring.
- `backend/tests/test_api_endpoints.py`: End-to-end FastAPI endpoint integration testing with `TestClient`.

---

## 8. Navigating the Web Application

- **/dashboard**: Executive KPIs, category distributions, monthly volume trends, top priority rankings, and recent investigation activity.
- **/datasets**: Interactive CSV ingestion wizard, column mapping detector, live validation reports, and historical import logs.
- **/analyzer**: Real-time complaint classifier with calibrated probability, decision confidence rating, uncertainty flagging, top influential words, and human verification controls.
- **/complaints**: Searchable server-paginated complaint explorer with category/severity/uncertainty filters, full detail modal, and similarity finder.
- **/topics**: Unsupervised theme discovery (NMF, LDA, K-Means), keyword weights cloud, representative records, and topic renaming.
- **/issue-intelligence**: Multi-category temporal trend charts, emerging issue alerts, and configurable priority weight sliders.
- **/investigations**: Root-cause cross-tabulation workspace, co-occurrence evidence breakdowns, and case notes audit trail.
- **/model-lab**: Model comparison matrix, active model selector, confusion matrices, and per-class precision/recall metrics.
- **/reports**: One-click UTF-8 CSV exports for complaints, model metrics, priorities, and investigations.
- **/settings**: Parameter tuning for similarity thresholds, growth sensitivity, and uncertainty bounds.

---

## 9. Academic Domain & Project Verification

- **Domain:** B.Tech CSE — Data Science & Machine Learning
- **Complexity Level:** Intermediate to Advanced
- **Version:** 1.0
- **Status:** All functional requirements (FR-01 through FR-12) fully implemented and tested with 100% test pass rate.
