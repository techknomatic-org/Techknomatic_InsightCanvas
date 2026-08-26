# InsightCanvas — Comprehensive Technical Architecture & Project Documentation

**Project**: InsightCanvas  
**Owner / Organization**: Techknomatic Services Pvt. Ltd. ([https://techknomatic.com](https://techknomatic.com))  
**Version**: 0.1.0  
**Status**: Production Ready  

---

## Table of Contents
1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Frontend System Architecture (React 18 + TypeScript)](#3-frontend-system-architecture-react-18--typescript)
   - 3.1 State Management & Redux Architecture
   - 3.2 UI Design System & Component Hierarchy
   - 3.3 Multi-Engine Chart Rendering Pipeline
   - 3.4 Interactive Rich-Text Report System
4. [Backend System Architecture (Python / Flask)](#4-backend-system-architecture-python--flask)
   - 4.1 Server Lifecycle & Initialization
   - 4.2 Multi-Provider LLM Gateway & ModelRegistry
   - 4.3 Agent Orchestration & Reasoning Pipeline
   - 4.4 Data Lake & Workspace Storage Architecture
   - 4.5 Enterprise Data Connectors & Catalog Discovery
5. [Security, Sandboxing & Data Isolation](#5-security-sandboxing--data-isolation)
   - 5.1 Python Code Execution Sandboxing (Local & Docker)
   - 5.2 AST Code Signing & Anti-Tampering
   - 5.3 Log Sanitization & Sensitive Secret Scrubbing
   - 5.4 Path Safety & Workspace Confinement
   - 5.5 TokenStore & SSO / OAuth Security
6. [Communication Protocols & API Specification](#6-communication-protocols--api-specification)
   - 6.1 Server-Sent Events (SSE) Streaming Protocol
   - 6.2 REST API Endpoints Catalog
   - 6.3 DataFrame & Custom Data Type Serialization
7. [Data Thread & DAG Transformation Model](#7-data-thread--dag-transformation-model)
8. [Error Handling & Resilience Framework](#8-error-handling--resilience-framework)
9. [Build, Packaging & Distribution Architecture](#9-build-packaging--distribution-architecture)

---

## 1. Executive Summary & Product Vision

**InsightCanvas** is a modern, enterprise-grade conversational data analytics, transformation, visualization, and reporting platform. Built by **Techknomatic Services Pvt. Ltd.**, InsightCanvas bridges the gap between raw, distributed enterprise datasets and decision-making by pairing an autonomous agentic AI backend with a declarative grammar-of-graphics visual canvas.

### Core Architectural Tenets
- **Data Privacy & Local Sovereignty**: Full datasets reside in local memory, private storage volumes, or customer databases. The LLM receives only metadata schemas and minimal statistical samples.
- **Non-Destructive Exploration**: All transformations are modeled as a Directed Acyclic Graph (DAG), enabling analysts to branch into alternative hypotheses, backtrack, or compare transformation states without data loss.
- **Multi-Engine Visual Power**: Visualizations leverage Vega, Vega-Lite, Apache ECharts, and D3.js under a single declarative encoding framework.
- **Unified Full-Stack Delivery**: Python backend and compiled React single-page frontend are bundled together for instant containerized deployment.

---

## 2. End-to-End System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (BROWSER)                                    │
│                                                                                             │
│  ┌────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │   UI Views & Layout    │  │  Redux Toolkit State    │  │   Visualization Engine       │  │
│  │ • Hero Landing / Menu  │  │ • dfSlice (Tables/Cards)│  │ • Vega / Vega-Lite Embedder  │  │
│  │ • AgentChatInput (Mic) │  │ • Workspace Metadata    │  │ • Apache ECharts Renderer    │  │
│  │ • TipTap Report Editor │  │ • Auth & Session Store  │  │ • D3 / Chart.js Compilers    │  │
│  └───────────┬────────────┘  └────────────┬────────────┘  └──────────────┬───────────────┘  │
└──────────────┼────────────────────────────┼──────────────────────────────┼──────────────────┘
               │                            │                              │
               │ HTTP REST & SSE Streaming  │                              │
               ▼                            ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION SERVER (PYTHON / FLASK)                            │
│                                                                                             │
│  ┌────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │  REST & SSE Endpoints  │  │   Agent Orchestrator    │  │     ModelRegistry Gateway    │  │
│  │ • /api/agent/stream    │  │ • AgentDataLoad         │  │ • OpenAI / Azure OpenAI      │  │
│  │ • /api/tables          │  │ • AgentSimple           │  │ • OpenRouter / Anthropic     │  │
│  │ • /api/data-loaders    │  │ • AgentDiagnostics      │  │ • Gemini / DeepSeek / Ollama │  │
│  │ • /api/workspaces      │  │ • AgentWorkflowDistill  │  │ • Rate Limiter & Fallbacks   │  │
│  └───────────┬────────────┘  └────────────┬────────────┘  └──────────────┬───────────────┘  │
│              │                            │                              │                  │
│              ▼                            ▼                              ▼                  │
│  ┌────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │   Data Connectors API  │  │     Sandbox Runtime     │  │   Security & Sanitization    │  │
│  │ • Postgres, MySQL, SQL │  │ • Subprocess Confinement│  │ • Secret Log Scrubber        │  │
│  │ • Kusto, S3, AzureBlob │  │ • Docker Sandbox Mode   │  │ • Code Signing HMAC Validator│  │
│  │ • Mongo, Cosmos DB     │  │ • Memory & Time Limiters│  │ • Path Traversal Defense    │  │
│  └────────────────────────┘  └─────────────────────────┘  └──────────────────────────────┘  │
└───────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                            │ Filesystem I/O
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENT STORAGE ($DATA_FORMULATOR_HOME)                     │
│  ├── users/<id>/workspaces/ (Parquet tables, JSON state archives, session snapshots)        │
│  ├── sessions/ (CacheLib server-side session tokens)                                        │
│  └── cache/ (Remote schema and query slice cache)                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend System Architecture (React 18 + TypeScript)

### 3.1 State Management & Redux Architecture (`dfSlice.tsx`)
The global frontend state is unified in the Redux store (`src/app/dfSlice.tsx`), structured into five core sub-states:

```typescript
interface DataFormulatorState {
    tables: DictTable[];                 // Loaded tabular datasets & schemas
    userCharts: Chart[];                 // User-created and customized charts
    triggerCharts: Chart[];              // Auto-recommended chart suggestions
    textTurns: TextTurn[];               // Conversational thread history (DAG nodes)
    activeWorkspace: WorkspaceSummary;   // Current active workspace metadata
    serverConfig: ServerConfig;          // Dynamic capabilities sent from Flask backend
    dataLoadingChatMessages: ChatMsg[];  // Interactive intake conversation stream
    activeTab: UploadTabType;            // Modal data connection tab state
}
```

#### Key State Life-Cycle Actions:
- `addTable`: Ingests a new table into memory with column semantics (nominal, quantitative, temporal).
- `deriveTable`: Creates a child node in the Data Thread DAG linked to its parent table via `parentNodeId`.
- `updateChart`: Updates visual channel encodings (X, Y, Color, Size) and re-triggers Vega/ECharts render.
- `setSession`: Restores a workspace snapshot from disk or ZIP archive without reloading the browser.

### 3.2 UI Design System & Component Hierarchy
- **Design Tokens (`src/app/tokens.ts`)**: Defines unified color palettes, elevation shadows, transitions, and border radii.
- **Rainbow Prism Accent**: All major AI surfaces (such as `AgentChatInput`) share a 3.5px gradient top border (`#00d2ff` → `#3b82f6` → `#8b5cf6` → `#e040fb`) on a 24px rounded white card.
- **Responsive Layout Manager (`LayoutProvider.tsx`)**: Dynamic split-pane system with collapsible sidebars and virtualized data table grids.

### 3.3 Multi-Engine Chart Rendering Pipeline
```
[User Query / Visual Encoding]
             │
             ▼
    [Chart Specification]
    ├── Mark: Bar, Line, Scatter, Area, Heatmap, etc.
    ├── Encodings: X, Y, Color, Size, Facet, Tooltip
    └── Aggregations: Sum, Mean, Median, Min, Max, Count
             │
      ┌──────┴─────────────────────────┐
      ▼                                ▼
[Vega-Lite Grammar Compiler]    [ECharts / D3 Engine]
      │                                │
      ▼                                ▼
[SVG / HTML5 Canvas Element]    [WebGL / Canvas Element]
```

### 3.4 Interactive Rich-Text Report System (`ReportView.tsx` & `TiptapReportEditor.tsx`)
- Embeds live, dynamic InsightCanvas visualizations inside Markdown documents.
- Includes a rich-text toolbar (Bold, Italic, Lists, LaTeX Math, Dynamic Figures, Tables).
- Visualizations maintain live data bindings; modifying a table automatically updates the embedded figure in the report.

---

## 4. Backend System Architecture (Python / Flask)

### 4.1 Server Lifecycle & Initialization (`py-src/data_formulator/app.py`)
1. **Environment Load**: Loads `.env` via `python-dotenv` before initializing any sub-modules.
2. **Session Security**: Sets `FLASK_SECRET_KEY` and configures `FileSystemCache` to prevent session cookies from exceeding the 4KB browser limit.
3. **Static File Server**: Mounts `py-src/data_formulator/dist/` as the static root, serving `index.html` and bundled JS/CSS chunks directly.
4. **Blueprint Registration**: Registers route blueprints for `agents`, `tables`, `credentials`, `knowledge`, `logs`, `sessions`, and `data-loaders`.

### 4.2 Multi-Provider LLM Gateway (`model_registry.py`)
The `ModelRegistry` abstracts all LLM communications through a unified interface:
- **Automatic Fallbacks**: Gracefully switches to text-only prompts if vision capabilities are unsupported by the active model.
- **Provider Adapters**: OpenAI, Azure OpenAI, OpenRouter, Anthropic, Google Gemini, DeepSeek, and Ollama.
- **Model Parameters**: Temperature, top_p, max_tokens, and token streaming hooks.

### 4.3 Agent Orchestration Pipeline
```
[User Natural Language Prompt]
             │
             ▼
   [Intent Classifier]
             │
   ┌─────────┼─────────────────────────┐
   ▼         ▼                         ▼
[Data Load] [Transformation Agent]   [Diagnostic Agent]
   │         │                         │
   │         ▼                         │
   │   [Prompt Assembly]               │
   │   • System Prompt                 │
   │   • Input Table Schema            │
   │   • Sample Rows (5-10 rows)       │
   │   • Domain Knowledge Rules        │
   │         │                         │
   │         ▼                         │
   │   [LLM Code Generation]           │
   │         │                         │
   │         ▼                         │
   │   [HMAC Code Signing]             │
   │         │                         │
   │         ▼                         │
   │   [Sandbox Python Execution]      │
   │         │                         │
   └─────────┼─────────────────────────┘
             │
             ▼
   [Output Validation & Parquet Serialization]
             │
             ▼
   [SSE Stream Response to Frontend]
```

### 4.4 Data Lake & Workspace Storage (`workspace_factory.py`)
- Workspaces are structured under `$DATA_FORMULATOR_HOME/users/<user_id>/workspaces/<workspace_id>/`.
- Datasets are stored as binary `.parquet` files for fast vector I/O and zero-copy loading via PyArrow and DuckDB.
- Workspace archives (`.zip`) bundle all Parquet files and the JSON state DAG for seamless migration across servers.

---

## 5. Security, Sandboxing & Data Isolation

### 5.1 Python Code Execution Sandboxing
1. **Local Subprocess Sandbox (`local_sandbox.py`)**:
   - Executes generated transformation code in an isolated subprocess with stripped environment variables (no access to `OPENAI_API_KEY` or `FLASK_SECRET_KEY`).
   - Imposes hard memory and execution time limits (default 60 seconds).
2. **Docker Confined Sandbox (`docker_sandbox.py`)**:
   - For multi-tenant cloud environments (`SANDBOX=docker`), spins up ephemeral Docker containers with read-only root filesystems and no network access.

### 5.2 AST Code Signing & Anti-Tampering (`code_signing.py`)
- Before executing code returned by the LLM or client, an HMAC-SHA256 signature is calculated against the parsed Python AST.
- Prevents injection of unauthorized system commands or modified payloads in transit.

### 5.3 Log Sanitization (`log_sanitizer.py`)
- Real-time regex scrubber strips sensitive credentials (OpenAI API keys, database connection strings, passwords, JWT bearer tokens) before writing to disk logs or stderr.

### 5.4 Path Safety & Workspace Confinement (`path_safety.py`)
- Validates all uploaded file paths against directory traversal attacks (`../`, `..\\`).
- Enforces strict canonical path confinement inside the user's isolated workspace sandbox.

---

## 6. Communication Protocols & API Specification

### 6.1 Server-Sent Events (SSE) Streaming Protocol (`/api/agent/stream`)
The agent communicates progress via NDJSON events over an HTTP SSE connection:
```json
data: {"type": "status", "phase": "generating_code", "message": "Analyzing data schema..."}
data: {"type": "reasoning", "content": "Need to group by 'Region' and aggregate 'Sales'..."}
data: {"type": "code", "content": "df_out = df.groupby('Region')['Sales'].sum().reset_index()"}
data: {"type": "execution", "status": "success", "rows": 5}
data: {"type": "result", "table_id": "tbl_a1b2c3", "preview": [...]}
```

### 6.2 Key REST Endpoints

| Endpoint | Method | Input Payload | Output |
| :--- | :--- | :--- | :--- |
| `/api/server-config` | `GET` | — | Feature flags, available models, auth status |
| `/api/upload/scratch` | `POST` | `multipart/form-data` (file) | Scratch file path |
| `/api/connectors/get-catalog-tree` | `POST` | `{ "connector_id": "..." }` | Hierarchical multi-database and table tree |
| `/api/connectors/import-data` | `POST` | `{ "connector_id": "...", "database": "...", "table": "..." }` | Ingestion status & Parquet file reference |
| `/api/intelligence/profile` | `POST` | `{ "table_names": [...] }` | Data profile summary & schema graph |
| `/api/intelligence/suggestions` | `POST` | `{ "table_names": [...] }` | Automated dashboard goal recommendations |
| `/api/intelligence/generate-dashboard` | `POST` | `{ "user_goal": "...", "table_names": [...] }` | Complete hydrated DashboardSpec (4 KPIs, 6 Vizzes, Slicer) |
| `/api/intelligence/query-filter` | `POST` | `{ "dashboard": {...}, "filter": {...} }` | Filtered KPI values and visualization datasets via DuckDB |
| `/api/intelligence/refine` | `POST` | `{ "dashboard": {...}, "user_instruction": "..." }` | Modified & self-healed DashboardSpec |
| `/api/intelligence/generate-report` | `POST` | `{ "dashboard": {...} }` | In-depth C-suite Markdown analytical report |
| `/api/intelligence/sessions` | `GET` | — | Saved dashboard sessions list |
| `/api/intelligence/sessions/save` | `POST` | `{ "session_id": "...", "dashboard": {...} }` | Persistence confirmation |
| `/api/workspaces` | `GET` | — | List of available user workspaces |
| `/api/workspaces/export` | `POST` | `{ "workspace_id": "..." }` | ZIP binary stream |
| `/api/workspaces/import` | `POST` | `multipart/form-data` (.zip) | Restored workspace summary |

---

## 7. Data Thread & DAG Transformation Model

```
[Raw Customers.csv] (Root Table)
        │
        ├─────────────────────────────────────────┐
        ▼ (AI Filter: Active Customers)           ▼ (AI Sort: Top 10 by Spend)
[Active_Customers] (Derived Node 1)          [Top_Spend_Users] (Derived Node 2)
        │                                         │
        ▼ (AI Join with Orders)                   ▼ (Chart: Spend Distribution)
[Customer_Orders_Merged] (Derived Node 3)
```

Each transformation step creates a new immutable node in the DAG:
- **Traceability**: Every chart displays the exact Python code and source data slice used to create it.
- **Auditability**: Complete lineage tracking from original source database to final executive report.

---

## 8. Error Handling & Resilience Framework

### Error Domain Categories
- `ERR_CONNECTOR_*`: Database connectivity failures, invalid credentials, timeout.
- `ERR_SANDBOX_*`: Code syntax errors, out-of-memory limits, disallowed Python modules.
- `ERR_LLM_*`: Rate limits (HTTP 429), context length exceeded, API key authorization failure.
- `ERR_WORKSPACE_*`: File corruption, storage quota exceeded, version incompatibility.

### Automated Recovery Policies
1. **Code Execution Errors**: When Python sandbox execution fails, the traceback is automatically fed back to the LLM agent for self-correction (up to 3 automated retry attempts).
2. **Rate Limit Handling**: Exponential backoff with jitter on LLM API calls.
3. **Session Reconnection**: Frontend automatically buffers unsent prompts and resumes SSE streams on transient network drops.

---

## 9. Build, Packaging & Distribution Architecture

```
[Source Code: TypeScript + Python]
              │
              ├── Frontend Build: `yarn build` (Vite)
              │   └── Output: `py-src/data_formulator/dist/`
              │
              ├── Python Packaging: `pyproject.toml`
              │   └── Includes compiled `dist/` static bundle
              │
              ├── Container Image: `Dockerfile` (Multi-stage)
              │   ├── Stage 1: node:20-slim (Builds Vite bundle)
              │   └── Stage 2: python:3.11-slim (Runs unified standalone app)
              │
              └── Output: `insight-canvas:latest` Docker Image
```

---

*InsightCanvas — Built with pride by Techknomatic Services Pvt. Ltd.*  
*For questions, technical support, or enterprise architecture inquiries: `support@techknomatic.com`*
