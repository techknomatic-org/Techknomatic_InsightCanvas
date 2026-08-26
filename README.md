<p align="center">
  <a href="https://techknomatic.com" target="_blank" rel="noopener noreferrer">
    <img src="./docs/assets/techknomatic-logo.svg" alt="Techknomatic Logo" width="320">
  </a>
</p>

<h1 align="center">InsightCanvas</h1>

<p align="center">
  <strong>Turn your data into actionable business insights with AI.</strong>
</p>

<p align="center">
  <a href="https://techknomatic.com"><img src="https://img.shields.io/badge/Powered%20By-Techknomatic%20Services%20Pvt%20Ltd-1B75BB?style=for-the-badge" alt="Techknomatic"></a>&nbsp;
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License: MIT"></a>&nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/Fast%20Setup-1--Click%20Ready-success?style=for-the-badge" alt="Setup Ready"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white" alt="Flask">
</p>

---

## 📖 Overview

**InsightCanvas** is an enterprise-grade, conversational data exploration, visualization, and interactive reporting platform developed by **Techknomatic Services Pvt. Ltd.**

By combining autonomous AI agents with a declarative grammar-of-graphics visual canvas, InsightCanvas enables data analysts, engineers, business stakeholders, and executives to explore complex datasets, ask natural language questions, create publication-quality charts, and author live interactive reports in seconds.

---

## ✨ Key Capabilities

| Capability | Description |
| :--- | :--- |
| ⚡ **Intelligence Hub & Auto-Dashboards** | 1-Click automated BI dashboard generation from any data source with 4 KPI scorecards, 6 multi-dimensional charts, and dynamic cross-filtering. |
| 📑 **Executive Intelligence Reports** | In-depth AI strategic intelligence reports with embedded live visual charts, KPI scorecards, root-cause attribution, and prioritized action roadmaps. |
| 🤖 **Conversational AI Analytics** | Chat with an intelligent agent that understands your schemas, runs statistical analysis, and generates charts directly from natural language prompts. |
| 🔌 **Multi-Database Enterprise Connectors** | Connect to PostgreSQL, MySQL, SQL Server, MongoDB, Cosmos DB, Azure Data Explorer, S3, or local folders with interactive multi-database catalog navigation. |
| 🎯 **Self-Healing Agent Accuracy Engine** | Built-in column inventory, fuzzy schema matching, and self-healing repair loops to eliminate SQL errors and hallucinated fields. |
| 📊 **Multi-Engine Visualizations** | Declarative rendering engine supporting **Vega**, **Vega-Lite**, **Apache ECharts**, **D3.js**, and **Chart.js** for dozens of chart types. |
| 📥 **Pixel-Perfect PDF & Image Export** | Export upright, high-resolution dashboards and multi-page executive reports to PDF, JPG, and PNG with zero browser artifacts. |
| 🎨 **One-Click Style Refinement** | AI aesthetic polish agent adjusts typography, curated color palettes, mark opacity, grid contrast, and legends for executive presentations. |
| 🔒 **Enterprise Sandboxing & Privacy** | Full datasets stay private in local storage or your database; Python code execution is isolated in secure subprocess/Docker sandboxes. |
| 🌐 **Multi-Model LLM Gateway** | Works seamlessly with OpenAI (GPT-4o), Azure OpenAI, Anthropic Claude, Google Gemini, DeepSeek, OpenRouter, and local Ollama models. |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (BROWSER)                           │
│     React 18 SPA · TypeScript · Redux Toolkit · Vega / ECharts / D3        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST & SSE Streaming
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION SERVER (PYTHON / FLASK)                   │
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │   REST & SSE Routes    │  │ Agent Orchestrator │  │ ModelRegistry     │  │
│  │ • /api/agent/stream    │  │ • Data Load Agent  │  │ • OpenAI / Azure  │  │
│  │ • /api/tables          │  │ • Analytics Agent  │  │ • Claude / Gemini │  │
│  │ • /api/data-loaders    │  │ • Diagnostic Agent │  │ • Local Ollama    │  │
│  └───────────┬────────────┘  └─────────┬──────────┘  └─────────┬─────────┘  │
│              │                         │                       │            │
│              ▼                         ▼                       ▼            │
│  ┌────────────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │ Data Connectors API    │  │ Python Sandbox     │  │ Security Scrubber │  │
│  │ • SQL & NoSQL Engines  │  │ • Local / Docker   │  │ • Secret Sanitizer│  │
│  │ • Cloud Lakes & S3     │  │ • Memory Limits    │  │ • HMAC Signing    │  │
│  └────────────────────────┘  └────────────────────┘  └───────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Parquet / SQLite I/O
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PERSISTENT STORAGE ($DATA_FORMULATOR_HOME)              │
│            Workspaces · User Datasets · Cached Schemas · Snapshots          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: One-Click Windows Launchers (Recommended)

1. **First-Time Setup** (Checks Python, Node.js, installs dependencies):
   ```cmd
   setup.bat
   ```
2. **Start Development Servers** (Launches Backend on `:5567` + Frontend on `:5173`):
   ```cmd
   start.bat
   ```
3. **Stop All Servers Cleanly**:
   ```cmd
   stop.bat
   ```

---

### Option 2: Production Standalone Runner (One-Click)

To run the unified production build (Frontend + Backend on port `5567`):
```cmd
run_production.bat
```

---

### Option 3: Cross-Platform Terminal Setup (macOS / Linux / Windows)

```bash
# 1. Install frontend packages and build bundle
yarn install --frozen-lockfile
yarn build

# 2. Set up Python backend environment
uv sync

# 3. Configure environment
cp .env.template .env

# 4. Start the application server
uv run data_formulator --host 0.0.0.0 --port 5567
```

---

## 📚 Documentation & Technical Guides

Comprehensive guides and operational manuals are available in the [`docs/`](docs/) directory:

- 🌟 [**Features & Specifications**](docs/FEATURES.md): Full feature catalog and functional matrix.
- 🚀 [**Production Deployment Guide**](docs/DEPLOYMENT.md): Containerization, Cloud (Render/AWS/Azure/GCP), Nginx SSL, and Systemd.
- 📐 [**Project Technical Architecture**](docs/PROJECT_DOCUMENTATION.md): Deep-dive into technical architecture, Redux models, APIs, and sandboxing.
- 🤝 [**Project Handover Guide**](docs/HANDOVER.md): Developer and operational handover manual.
- 📖 [**User Guide & Tutorial**](docs/USER_GUIDE.md): Step-by-step visual tutorial and UI walkthrough.
- 📘 [**User Handbook & Playbook**](docs/USER_HANDBOOK.md): Prompt engineering patterns, chart selection matrices, and formulas.

---

## ⚙️ Configuration Reference (`.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | `""` | Primary OpenAI API Key for AI agent intelligence |
| `FLASK_SECRET_KEY` | *(auto-generated)* | 32-byte hex key for securing session tokens |
| `SANDBOX` | `local` | Sandbox execution mode (`local` or `docker`) |
| `DISABLE_DISPLAY_KEYS` | `true` | Prevents API keys from being displayed in the client UI |
| `DATA_FORMULATOR_HOME` | `~/.data_formulator` | Root storage directory for user tables, parquet files, and workspaces |

---

## 🧪 Testing & Quality Assurance

```bash
# Frontend Type Check (0 errors)
npx tsc --noEmit

# Frontend Unit Tests
yarn test

# Backend Python Tests
uv run pytest tests/backend/
```

---

## 🏢 Ownership & Enterprise Support

**InsightCanvas** is designed and maintained by **Techknomatic Services Pvt. Ltd.**

- **Website**: [https://techknomatic.com](https://techknomatic.com)
- **Contact & Support**: `support@techknomatic.com`
- **License**: [MIT License](LICENSE)

---

<p align="center">
  <strong>© Techknomatic Services Pvt. Ltd. All rights reserved.</strong>
</p>
