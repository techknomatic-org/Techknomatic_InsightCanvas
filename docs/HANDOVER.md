# InsightCanvas — Technical Project Handover Document

**Company**: Techknomatic Services Pvt. Ltd.  
**Project**: InsightCanvas (Enterprise Conversational Analytics & Interactive Visualization Platform)  
**Version**: 0.1.0  
**Target Audience**: Software Engineers, DevOps Engineers, Product Managers, and System Administrators

---

## 1. Executive Summary

This handover document provides all necessary technical knowledge, operational instructions, environment configurations, and maintenance guidelines required to develop, test, build, deploy, and maintain **InsightCanvas**.

---

## 2. Technology Stack & Key Dependencies

### 2.1 Frontend
- **Runtime & Framework**: Node.js (v18+), React 18, TypeScript 5.9.
- **Build Tool**: Vite 7 with Rollup code-splitting.
- **State Management**: Redux Toolkit, Redux Persist.
- **UI Components**: Material UI (MUI v7), Emotion Styled.
- **Visualization**: Vega, Vega-Lite, Apache ECharts, D3.js, Chart.js.
- **Rich Text & Reports**: TipTap Markdown Editor, KaTeX math typesetting.

### 2.2 Backend
- **Runtime**: Python 3.11+ (Managed via `uv` or `pip`).
- **Web Framework**: Flask with SSE (Server-Sent Events) streaming.
- **Data Processing**: Pandas, NumPy, PyArrow (Parquet engine), DuckDB.
- **LLM Gateway**: LiteLLM / Custom ModelRegistry supporting OpenAI, Azure, OpenRouter, Anthropic, Gemini, DeepSeek, and local Ollama models.
- **Database Connectors**: `psycopg2-binary`, `pymysql`, `pyodbc`, `pymongo`, `azure-cosmos`, `azure-kusto-data`, `boto3`.

---

## 3. Repository Directory Structure

```
InsightCanvas/
├── render.yaml                        # Cloud deployment configuration
├── package.json / yarn.lock           # Frontend dependencies & build commands
├── pyproject.toml / uv.lock           # Python backend dependencies & metadata
├── tsconfig.json / vite.config.ts     # TypeScript & Vite bundler settings
├── .env.template                      # Canonical environment configuration template
├── start.bat / stop.bat               # Windows local dual-server launcher / stopper
├── run_production.bat                 # Standalone production server runner
├── setup.bat                          # Automated dependency installer for Windows
│
├── docs/                              # Project Documentation & Operational Guides
│   ├── FEATURES.md                    # Detailed capability specifications
│   ├── DEPLOYMENT.md                  # Comprehensive deployment manual
│   ├── PROJECT_DOCUMENTATION.md       # Technical architecture & API schemas
│   ├── HANDOVER.md                    # This developer & operational handover guide
│   ├── USER_GUIDE.md                  # End-user tutorial and step-by-step walkthrough
│   └── USER_HANDBOOK.md               # User playbook, tips, formulas & FAQ
│
├── src/                               # Frontend React TypeScript source code
└── py-src/                            # Backend Python Flask package (`data_formulator`)
    └── data_formulator/dist/          # Production frontend build assets (mounted by Flask)
```

---

## 4. Local Development Workflow

### 4.1 First-Time Setup
Run the automated Windows setup script:
```cmd
setup.bat
```
*Or manually via terminal:*
```bash
# 1. Install frontend packages
yarn install --frozen-lockfile

# 2. Setup Python virtual environment & sync dependencies
uv sync

# 3. Create .env file
cp .env.template .env
```

### 4.2 Running Development Servers
```bash
# Terminal 1: Run Backend API in development mode
uv run data_formulator --port 5567 --dev

# Terminal 2: Run Frontend Vite Dev Server with HMR (Hot Module Replacement)
yarn start --port 5173
```
Open `http://localhost:5173`. Requests to `/api/*` are automatically proxied to the backend on `5567`.

---

## 5. Verification & Testing Standards

Before committing code or deploying to production, execute the following test suite:

1. **TypeScript Type Safety**:
   ```bash
   npx tsc --noEmit
   ```
   *(Must exit with 0 errors)*

2. **Frontend Unit & Component Tests**:
   ```bash
   yarn test
   ```

3. **Backend Unit & Integration Tests**:
   ```bash
   uv run pytest tests/backend/
   ```

4. **Production Bundle Verification**:
   ```bash
   yarn build
   ```

---

## 6. Key Configuration Variables (`.env`)

| Variable | Recommended Default | Description |
| :--- | :--- | :--- |
| `FLASK_SECRET_KEY` | *(Random 32-byte hex)* | Encrypts session cookies and validates agent signatures. |
| `OPENAI_API_KEY` | `sk-...` | Primary OpenAI API Key for AI operations. |
| `SANDBOX` | `local` | Python code execution sandbox (`local`). |
| `DISABLE_DISPLAY_KEYS` | `true` (prod) / `false` (dev) | Prevents API keys from being displayed in the client UI. |
| `DATA_FORMULATOR_HOME` | `~/.data_formulator` | Root storage directory for user tables, parquet files, and sessions. |

---

## 7. Operational Troubleshooting & FAQ

### Q1: The frontend shows "Failed to connect to backend server".
- **Cause**: Backend service is either not running on port `5567` or blocked by a local firewall.
- **Resolution**: Verify backend is running via `curl http://localhost:5567/api/server-config` or check `python -m uv run data_formulator --dev`.

### Q2: LLM responses hang or return timeout errors.
- **Cause**: Invalid API key, rate limits reached, or network proxies blocking OpenAI/OpenRouter endpoints.
- **Resolution**: Check `OPENAI_API_KEY` in `.env`. Verify model status under **Model Settings** in the top-right toolbar.

### Q3: How to reset workspace state or clear corrupted data?
- Delete or archive the user's workspace folder in `$DATA_FORMULATOR_HOME/users/<user_id>/workspaces/`.

---

## 8. Handover Contact & Ownership

- **Lead Organization**: Techknomatic Services Pvt. Ltd.
- **Official Website**: [https://techknomatic.com](https://techknomatic.com)
- **Support & Inquiries**: `support@techknomatic.com`

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
