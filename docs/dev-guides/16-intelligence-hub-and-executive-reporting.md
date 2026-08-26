# Developer Guide 16: Intelligence Hub & Executive Strategic Reporting Engine

**Author**: Techknomatic Services Pvt. Ltd.  
**Version**: 1.0.0  
**Scope**: Intelligence Hub Backend (`routes/intelligence.py`), Frontend (`views/IntelligenceHub/`), DuckDB Lake Hydration, Self-Healing Accuracy, and PDF Export Engine.

---

## 1. Architectural Overview

The **Intelligence Hub** provides autonomous, zero-touch business intelligence dashboard synthesis, multi-dimensional visual generation, dynamic cross-filtering, and strategic executive reporting across relational and Parquet datasets.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTELLIGENCE HUB ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Ingestion & Profile ──► 2. Schema Graph & DuckDB ──► 3. LLM Prompting   │
│     • Parquet Table Lake       • _unified_analytics View     • Stripped Context │
│     • Dtype Inferences         • Foreign Key Joins           • Column Inventory │
│                                                                             │
│  4. Accuracy Guardrails ──► 5. DuckDB Hydration ─────► 6. Executive Report │
│     • Fuzzy Column Fix         • 4 KPIs Computed             • Embedded Visuals │
│     • Smart Aggregations       • 6 Chart Records             • C-Suite Insights │
│     • Self-Healing Loop        • Filter Slices               • High-DPI PDF     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Accuracy & Self-Healing Pipeline

To guarantee 100% data accuracy and eliminate hallucinated columns or query failures, the backend implements a multi-stage validation and repair pipeline:

### 2.1 Context Noise Minimization (`_strip_spec_for_llm`)
Strips heavy query records, compiled Vega specs, and raw data objects before feeding existing dashboard state back to the LLM during refinements, preventing context saturation and prompt degradation.

### 2.2 Column Inventory & Fuzzy Matching (`_build_column_inventory`, `_validate_and_fix_spec`)
Builds a verified data dictionary mapping all available columns, physical types, and distinct sample values. Any mis-cased or slightly hallucinated field in LLM SQL or Vega encodings is automatically corrected via case-insensitive and `difflib` string similarity matching.

### 2.3 Automated Post-Hydration Self-Healing Loop
After DuckDB query execution:
1. The engine checks for any `N/A` KPI values or empty chart datasets caused by syntax errors.
2. If anomalies are detected, it triggers an automated repair pass with the LLM, providing the exact SQL error and verified column list.
3. Repaired queries are immediately re-hydrated before returning to the client.

### 2.4 BI Best-Practice Guardrails
- **Temporal Series**: Automatically truncates timestamps to monthly granularity (`DATE_TRUNC('month')`) and sorts chronologically ascending (`%b %Y`).
- **Pie & Donut Charts**: Capped at Top 7 categories with remaining items aggregated into `"Other"`.
- **Bar Charts**: Capped at Top 15 categories to eliminate visual overcrowding.
- **Smart Aggregations**: Overrides `SUM` to `AVG` for rate, percentage, and efficiency columns.

---

## 3. Executive Intelligence Reporting Pipeline

### 3.1 5-Section Strategic Narrative Architecture
The report synthesizer (`POST /api/intelligence/generate-report`) structures findings into:
1. **Executive Summary & Strategic Overview**: High-impact performance summary and vulnerability flags.
2. **KPI Performance Deep-Dive & Root-Cause Attribution**: Exact numbers, benchmark comparisons, and underlying operational drivers.
3. **Multi-Dimensional Visual Analytics Walkthrough**: In-depth analysis for each of the 6 charts referencing leader/laggard segments and outliers.
4. **Cross-Metric Correlations & Risk Evaluation**: Systemic risk analysis, margin pressure, and capacity bottlenecks.
5. **Strategic Recommendations & Prioritized Action Roadmap**: Actionable initiatives with expected impact and implementation timelines (Immediate, 30-Day, 90-Day).

### 3.2 Live Embedded Visuals
The frontend renderer embeds:
- 4 styled KPI scorecards with accent top borders, values, and baseline comparison chips.
- All 6 interactive SVG Vega visual charts directly inline within the report view.

---

## 4. Multi-Page PDF & Print Engine

### 4.1 Browser Header/Footer Suppression
Uses `@page { size: portrait; margin: 0mm; }` to instruct Chromium/Edge to suppress default browser URL (`localhost:...`) and timestamp headers.

### 4.2 Multi-Page Margins via Paged Table Spacers
Wraps document content in a table with repeating `<thead>` and `<tfoot>` margin spacers (`12mm`) to guarantee consistent top and bottom margins across all pages in a multi-page PDF.

### 4.3 Page-Break Protection
Applies `break-inside: avoid !important; page-break-inside: avoid !important;` on:
- `li` (bullet items)
- `p` (paragraphs)
- `tr` (table rows)
- `blockquote` (callouts)
- `.report-chart-card` (visual charts)
- `.report-kpi-card` (KPI scorecards)

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
