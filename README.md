# MedCDS — Medical Clinical Decision Support System

> Built for India: Where 800 patients share one doctor.

MedCDS helps patients compile a complete medical history (allergies, current medications, prior conditions, lab reports) and generates an AI-powered clinical report with safe drug suggestions — ready to show the doctor.

## What Was Changed (Claude API Integration)

The original project relied on **Infermedica** (paid), **Isabel** (paid), and **OpenAI** (paid).

This version uses **ONE key only**: the **Anthropic Claude API**, which is:
- Available for free credits at [console.anthropic.com](https://console.anthropic.com)
- Powers disease prediction (replaces Infermedica + Isabel)
- Powers clinical summaries (replaces OpenAI)
- Free APIs for drug data: OpenFDA, RxNorm, DailyMed (no key needed)

## Quick Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Get your Anthropic API Key
Go to [console.anthropic.com](https://console.anthropic.com) → Create API Key (free credits included)

### 2. Configure environment
```
cd backend
cp .env .env.backup   # already configured, just add your key
```

Edit `backend/.env` and set:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
MONGODB_URI=mongodb://localhost:27017/medcds
```

### 3. Install & Run

**Terminal 1 — Backend:**
```bash
cd backend
npm install --legacy-peer-deps
npm run seed       # Seeds clinical guidelines into MongoDB
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Open: http://localhost:3000

## How It Works

1. **Patient fills their history**: allergies, current medications, prior conditions
2. **New Assessment**: enters chief complaint + symptoms
3. **Claude AI** analyzes symptoms → differential diagnosis (up to 5 conditions)
4. **Guideline Engine** (local, no API) matches diseases to evidence-based drugs
5. **Safety Filter** (local, no API) removes drugs that conflict with patient's:
   - Allergies
   - Current medications (interaction checks)
   - Prior conditions (contraindications)
   - Age-specific rules
6. **OpenFDA / RxNorm** (free, no key) enriches drug data
7. **Claude AI** generates a professional clinical summary
8. **PDF Report** generated — ready to show to doctor

## APIs Used

| Service | Cost | Purpose |
|---------|------|---------|
| Anthropic Claude | Free credits | Disease prediction + summaries |
| OpenFDA | Always free | Drug labels, adverse events |
| RxNorm (NLM) | Always free | Drug interaction checks |
| DailyMed (NLM) | Always free | Drug information |

## Important Disclaimer

MedCDS is a **Clinical Decision Support Tool**, NOT a replacement for doctors. The reports are intended to:
- Help patients organize their medical history
- Show doctors a complete picture (including medications that may be unsafe for THIS patient)
- Support — never replace — professional medical judgment

Always consult a qualified healthcare provider before taking any medication.
