# InsightCanvas — Feature Specifications & Capabilities

**InsightCanvas** (by *Techknomatic Services Pvt. Ltd.*) is an AI-powered conversational analytics, data transformation, visualization, and automated reporting platform. It empowers data analysts, engineers, business stakeholders, and executives to transform raw datasets into production-grade interactive visualizations and reports using natural language and direct visual manipulation.

---

## 1. Core Architecture & Feature Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INSIGHTCANVAS                                       │
├──────────────────────────┬────────────────────────────┬────────────────────────────────┤
│    DATA INGESTION        │      AI ANALYTICS ENGINE   │      VISUALIZATION & REPORTS   │
├──────────────────────────┼────────────────────────────┼────────────────────────────────┤
│ • File Upload (CSV, JSON)│ • Natural Language Q&A     │ • Multi-Engine Visualizations  │
│ • Local Folder Mount     │ • Automated Transforms     │ • Interactive Chart Canvas     │
│ • SQL & NoSQL Databases  │ • Code Generation & Python │ • Visual Style Refinement      │
│ • Cloud Lakes (S3, Kusto)│ • Multi-Turn Data Threads  │ • TipTap Dynamic Reports       │
│ • Multimodal Extraction  │ • Knowledge Store & Rules  │ • Export to HTML / PNG / SVG   │
└──────────────────────────┴────────────────────────────┴────────────────────────────────┘
```

---

## 2. Comprehensive Feature Breakdown

### 2.1 AI-Powered Data Ingestion & Loading
- **Natural Language & Agentic Data Intake**:
  - The hero **Data Loading Agent** interprets user intent, questions, and uploaded artifacts.
  - Supports multimodal file intake (paste screenshots of tables, drag-and-drop CSV/Excel/JSON files, or provide text snippets) to extract structured tabular datasets automatically.
  - Interactive speech-to-text input via the integrated voice transcription button.
- **Enterprise Data Connectors**:
  - **Relational Databases**: PostgreSQL, MySQL, Microsoft SQL Server, SQLite.
  - **Cloud Data Warehouses & Lakes**: Azure Data Explorer (Kusto), Amazon S3, Azure Blob Storage, Microsoft OneLake.
  - **NoSQL & Modern Stores**: MongoDB, Azure Cosmos DB.
  - **BI Integrations**: Apache Superset catalog bridge with single sign-on (SSO) and OAuth.
- **Local Directory Synchronization**:
  - Direct mounting of local folders for low-latency batch imports and live updates.
- **Schema Discovery & Smart Catalog Tree**:
  - Automatic dtype inference (temporal, nominal, quantitative, ordinal, geospatial).
  - Virtualized catalog tree for exploring schemas, tables, views, and row samples with millisecond responsiveness.

---

### 2.2 Conversational Analytics & Data Transformation Engine
- **Autonomous Agent Workflows**:
  - **Code Generation**: Translates natural language requests into Python / Pandas transformation pipelines.
  - **Diagnostics & Data Quality**: Automatically identifies null values, outliers, duplicate records, and structural anomalies.
  - **Data Sorting & Reshaping**: Handles complex joins, unpivoting (melt), pivoting, window aggregations, and calculated metrics.
- **Sandboxed Execution**:
  - Secure local or Docker-confined Python runtime execution preventing arbitrary system escape.
  - Streaming stdout/stderr and reasoning logs for transparent verification of AI reasoning steps.
- **Branching & Data Threads**:
  - Non-destructive transformation history allowing users to fork analysis paths, backtrack to earlier states, or compare distinct transformation branches side-by-side.

---

### 2.3 Visual Encoding & Multi-Engine Chart Canvas
- **Multi-Engine Rendering Core**:
  - **Vega & Vega-Lite**: Declarative grammar-of-graphics specification with responsive interactivity, zooming, and tooltips.
  - **ECharts & D3.js**: High-performance interactive visualizations, heatmaps, hierarchical trees, and complex time series.
  - **Chart.js**: Lightweight executive summary cards and trend lines.
- **Visual Encoding Shelf**:
  - Drag-and-drop channel binding for `X-Axis`, `Y-Axis`, `Color`, `Size`, `Shape`, `Facet (Rows/Columns)`, `Opacity`, and `Tooltips`.
  - Automatic aggregation functions (Sum, Mean, Median, Min, Max, Count, Distinct Count, Variance, Standard Deviation).
- **Supported Chart Library**:
  - *Standard*: Bar, Stacked Bar, Grouped Bar, Column, Line, Area, Scatter, Bubble, Pie, Donut.
  - *Statistical*: Histogram, Box Plot, Violin Plot, Density Plot, Empirical Cumulative Distribution Function (ECDF), Strip Plot.
  - *Financial & Time*: Candlestick, Waterfall, Timeline / Gantt, Bump Chart, Slope Chart.
  - *Geographic & Advanced*: Choropleth Maps, Scatter Geo-points, Heatmaps, Treemaps, Sunbursts, Radar / Polar Charts, Lollipop Charts.

---

### 2.4 Style Refinement & Visual Polish Agent
- **One-Click Aesthetic Refinement**:
  - AI styling agent adjusts color palettes, typography scales, gridline contrast, label formatting, legend placement, and title positioning according to publication standards.
- **Curated Color Palettes**:
  - Accessible, colorblind-safe, dark mode tailored, and enterprise brand-aligned themes.
- **Direct Visual Tweaks**:
  - Fine-grained sliders for bar roundness, stroke widths, mark opacity, point sizes, and aspect ratios.

---

### 2.5 Dynamic Interactive Reporting System
- **Rich Document Editor (TipTap & Markdown)**:
  - Built-in live document editor supporting Markdown, mathematical formulas (LaTeX / KaTeX), formatted tables, and callout blocks.
- **Embedded Live Visualizations**:
  - Embed dynamic, interactive InsightCanvas charts directly inside report documents.
  - Auto-updating figures when underlying source tables or filters change.
- **Export & Sharing**:
  - Export reports as standalone HTML packages, publication-ready PDF summaries, or vector SVG/PNG graphics.

---

### 2.6 Multi-Model LLM Gateway & Security
- **Supported Providers**:
  - OpenAI (GPT-4o, GPT-4o-mini), OpenRouter, Azure OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Ollama / Local LLMs.
- **Enterprise Security**:
  - API Key Masking & server-side encryption via `TokenStore`.
  - Configurable server policies (`DISABLE_DISPLAY_KEYS`, `DISABLE_CUSTOM_MODELS`, `DISABLE_DATA_CONNECTORS`) for hardened public and multi-user deployments.
  - User session isolation with disk and memory quota management.

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
