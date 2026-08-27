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
  - Secure local subprocess Python runtime execution with strict timeouts and memory boundaries.
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

### 2.7 Intelligence Hub & Automated BI Dashboards
- **Zero-Touch Dashboard Synthesis**:
  - Automatically profiles ingested relational or Parquet datasets, identifies cross-table primary/foreign key relationships, and synthesizes complete analytical dashboards in seconds.
  - Generates domain-tailored titles, subtitles, and domain icons (Healthcare, Manufacturing, HR, Sales, Finance, Education, Logistics, Gaming, Media, Analytics).
- **Executive KPI Performance Scorecard**:
  - Computes 4 high-level strategic KPI metric cards with proper aggregation rules (Sum, Avg, Count, Min, Max), currency/percentage formatting, and baseline performance comparison badges.
- **6 Multi-Dimensional Visual Analytics Grid**:
  - Renders 6 distinct interactive Vega-Lite visual charts per dashboard:
    - Temporal timeline trajectories with ascending chronological ordering (`%b %Y`).
    - Categorical ranking breakdowns (Top 15 bar charts).
    - Composition and distribution visuals (Top 7 donut/pie charts with `"Other"` grouping).
    - Multi-variable scatter correlations and density heatmaps.
- **Dynamic Slicer & In-Memory DuckDB Cross-Filtering**:
  - Auto-detects optimal dimension columns for global slice filtering (e.g. Department, Store, Region, Category).
  - Instantly updates all 4 KPIs and 6 visualization charts across tables via in-memory DuckDB query execution (`_unified_analytics` view).

---

### 2.8 Self-Healing Agent Accuracy Engine & BI Guardrails
- **Column Inventory & Fuzzy Schema Matching**:
  - Builds an explicit dictionary of verified column names, physical data types, and distinct sample values before passing to LLMs.
  - Corrects casing discrepancies and hallucinated field names using case-insensitive and `difflib` fuzzy matching.
- **Self-Healing Execution Loop**:
  - Post-hydration validation detects any `N/A` KPI metrics or query execution failures.
  - Automatically triggers an LLM auto-repair pass with explicit error context to fix queries and regenerate accurate metrics without user intervention.
- **Smart Aggregation Override**:
  - Detects pre-calculated rates, averages, percentages, and efficiencies in column names and overrides incorrect `SUM()` aggregations to `AVG()`.
  - Enforces `COUNT(DISTINCT column)` for cardinality metrics.

---

### 2.9 Executive Intelligence Strategic Reporting
- **In-Depth C-Suite Strategic Narrative**:
  - Generates comprehensive strategic briefings structured into 5 sections:
    1. **Executive Summary & Strategic Overview**: Overall organizational health and top strategic highlights.
    2. **KPI Performance Deep-Dive & Root-Cause Attribution**: Exact metric values, benchmarks, and operational drivers.
    3. **Multi-Dimensional Visual Analytics & Trend Dynamics**: Granular walkthrough of each of the 6 charts with leader/laggard findings and outlier detection.
    4. **Cross-Metric Correlations & Risk Evaluation**: Systemic risk analysis, margin pressure, and capacity bottlenecks.
    5. **Strategic Recommendations & Prioritized Action Roadmap**: Actionable initiatives with expected impact and implementation timelines (Immediate / 30-Day / 90-Day).
- **Embedded Live Visuals & Scorecards**:
  - Embeds the 4 KPI scorecard cards and all 6 live SVG visualization charts directly within the report document alongside the analytical commentary.

---

### 2.10 High-DPI Export Pipeline (PDF, JPG, PNG)
- **Pixel-Perfect Multi-Page PDF Export**:
  - Paged print document layout with `@page { margin: 0mm; }` and repeating `<thead>`/`<tfoot>` margin spacers.
  - Completely suppresses browser-generated URLs (`localhost:...`), timestamps, and headers.
  - Implements `break-inside: avoid` on bullet points, paragraphs, tables, KPI cards, and charts to prevent text slicing across page splits.
- **Standalone Dashboard Image & PDF Export**:
  - 2x High-DPI canvas captures for JPG and PNG exports.
  - Upright, unrotated portrait PDF export with scope filter badges and zero branding watermark clutter.

---

### 2.11 Domain Safeguards, Dynamic Unit Systems & Navigation Ergonomics
- **Domain Relevance & Mismatch Detection**:
  - Automatically assesses dataset context against user query intent.
  - If a user requests metrics for an entity completely absent from the loaded tables (e.g. asking for "patients" on HR data), the system returns an informative explanatory notification rather than force-generating unrelated visuals.
- **Domain-Aware Unit Abbreviation Engine**:
  - Automatically recognizes and applies correct unit formatting across KPIs and chart tooltips:
    - **Energy & Power**: `kWh`, `MWh`, `kW`, `MW` (e.g. `2.88M kWh`, `2.0K kW`).
    - **Time & Duration**: `mins`, `hrs`, `days`.
    - **Emissions & Sustainability**: `tCO₂`.
    - **Financials & Currency**: `$B`, `$M`, `$K`.
- **Adaptive Time-Series & Sparse Data Handling**:
  - Automatically drills down from monthly to daily resolution when sparse time intervals are detected.
  - Converts 1-dot line charts to informative categorical bar/donut charts when datasets represent a single date snapshot.
- **Modern Unified Navigation Bar**:
  - Standardized top navbar with **Home**, **Intelligence Hub**, and **About** buttons featuring active indicators and smooth transitions.
  - Clean, unbolded session titles across sidebars for superior scannability and aesthetics.

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*

