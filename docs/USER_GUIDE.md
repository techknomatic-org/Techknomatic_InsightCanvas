# InsightCanvas — Comprehensive User Guide & Visual Walkthrough

**InsightCanvas** by *Techknomatic Services Pvt. Ltd.*

Welcome to the comprehensive user guide for **InsightCanvas**. This guide walks you through every feature of the platform, from data ingestion to creating production-grade interactive visualizations and reports.

---

## 1. Interface Overview & Navigation

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] InsightCanvas   [Workspaces ▼]   [Reports]   [About]          [Model: GPT-4o ▼] [🌙] [⚙ Settings]│
├──────────────────────┬─────────────────────────────────────────────────┬───────────────────────────────┤
│ 📂 DATASETS & TABLES │               📊 VISUALIZATION CANVAS           │       🤖 AI ANALYST CHAT      │
│                      │                                                 │                               │
│ ┌──────────────────┐ │ ┌─────────────────────────────────────────────┐ │ ┌───────────────────────────┐ │
│ │ • Customers.csv  │ │ │                 CHART PREVIEW               │ │ │ 👤 User:                  │ │
│ │ • Orders_2024.sql│ │ │                                             │ │ │ "Show monthly sales by    │ │
│ │ • Products.json  │ │ │          [Interactive Bar / Line]           │ │ │  region as a grouped bar" │ │
│ └──────────────────┘ │ │                                             │ │ │                           │ │
│                      │ └─────────────────────────────────────────────┘ │ │ 🤖 InsightCanvas:         │ │
│ [+ Add New Data]     │                                                 │ │ "Here is your visualization │ │
│                      │ ┌─────────────────────────────────────────────┐ │ │  grouped by region..."    │ │
│ ┌──────────────────┐ │ │            VISUAL ENCODING SHELF            │ │ └───────────────────────────┘ │
│ │ 🔀 DERIVED NODES │ │ │ X: [Month (T)]       Y: [Sales (Q, Sum)]    │ │                               │
│ │ • Cleaned_Orders │ │ │ Color: [Region (N)]  Size: [Margin (Q)]     │ │ ┌───────────────────────────┐ │
│ │ • Regional_Summary│ │ └─────────────────────────────────────────────┘ │ │ [✨] [Ask AI agent...]    │ │
│ └──────────────────┘ │                                                 │ │ [+] [🎤 Voice]     [↑ Send] │
│                      │                                                 │ └───────────────────────────┘ │
└──────────────────────┴─────────────────────────────────────────────────┴───────────────────────────────┘
```

### Main Interface Regions:
1. **Top Header**: Manage workspaces, access interactive reports, switch dark/light themes, and select AI models.
2. **Left Panel (Data Shelf & Catalog)**: View loaded data tables, browse schemas, and manage derived data threads.
3. **Center Canvas**: Main interactive chart area and visual channel encoding shelf.
4. **Right Panel (AI Analyst Chat)**: Conversational prompt box for data transformations, cleaning, and chart generation.

---

## 2. Ingesting Data into InsightCanvas

InsightCanvas offers 4 flexible methods to load datasets:

```
                      ┌──────────────────────────────────────┐
                      │          HOW TO LOAD DATA            │
                      └──────────────────┬───────────────────┘
                                         │
     ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
     ▼                   ▼                               ▼                   ▼
[1. Drag & Drop]   [2. Voice / Prompt]             [3. Image / OCR]    [4. Enterprise DB]
Drop CSV, Excel,   Click 🎤 & speak:               Paste screenshot    Connect Postgres,
JSON directly      "Find datasets on global        of any data table   MySQL, SQL Server,
into prompt box    renewable energy trends..."     (Ctrl + V)          Kusto, or Mongo
```

### Step 2.1: Drag & Drop Files
1. Drag any `.csv`, `.tsv`, `.json`, `.xlsx`, or `.parquet` file from your desktop into the prompt box.
2. The file will attach as a chip. Click **Send (↑)** to automatically parse the schema and ingest the table.

### Step 2.2: Paste Image / Screenshot
1. Take a screenshot of a data table from an email, PDF, or website.
2. Press **Ctrl + V** (or Cmd + V) while focused on the prompt box.
3. The AI agent will extract the columns, format data types, and load the table.

### Step 2.3: Voice Input
1. Click the **Microphone (🎤)** button in the bottom right of the prompt box.
2. Speak your data question or command clearly.
3. Click the mic button again to finalize and submit.

### Step 2.4: Connecting Databases & Cloud Storage
1. Click the **`+ Add Data`** button on the left sidebar.
2. Select your provider (**PostgreSQL**, **MySQL**, **Microsoft SQL Server**, **MongoDB**, **Azure Cosmos DB**, **Azure Kusto**, or **Amazon S3**).
3. Fill in your host, port, database, and credentials.
4. Click **Discover Tables** and choose the tables you wish to import.

---

## 3. Conversational Analytics & Data Transformation

### Step 3.1: Asking Natural Language Questions
Once data is loaded, you can ask exploratory questions directly in the chat panel:

```
User Prompt:
"What are the top 5 product categories by revenue in Q3 2024? Calculate the profit margin as well."

AI Analyst Response:
1. Filters dataset for Date >= 2024-07-01 and Date <= 2024-09-30.
2. Calculates: Profit Margin (%) = (Profit / Revenue) * 100.
3. Groups by Category, aggregates Revenue (Sum), and sorts descending.
4. Outputs new derived table: 'Q3_Top_Categories'.
```

### Step 3.2: Inspecting the Generated Code
Click **Show Code** on any transformation turn to inspect the exact Python / Pandas code executed in the sandbox:
```python
# Generated by InsightCanvas Transformation Agent
df_filtered = df[(df['Date'] >= '2024-07-01') & (df['Date'] <= '2024-09-30')].copy()
df_filtered['Profit_Margin'] = (df_filtered['Profit'] / df_filtered['Revenue']) * 100
df_out = df_filtered.groupby('Category')[['Revenue', 'Profit_Margin']].sum().reset_index()
df_out = df_out.sort_values(by='Revenue', ascending=False).head(5)
```

---

## 4. Visual Exploration & Chart Customization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VISUAL ENCODING SHELF                            │
├──────────────┬────────────────────────┬──────────────────┬──────────────────┤
│ Channel      │ Field Binding          │ Field Data Type  │ Aggregation      │
├──────────────┼────────────────────────┼──────────────────┼──────────────────┤
│ X-Axis       │ [Order_Date]           │ Temporal (T)     │ By Month         │
│ Y-Axis       │ [Total_Sales]          │ Quantitative (Q) │ Sum              │
│ Color        │ [Product_Category]     │ Nominal (N)      │ Discrete Groups  │
│ Size         │ [Quantity_Sold]        │ Quantitative (Q) │ Mean             │
│ Facet Column │ [Store_Region]         │ Nominal (N)      │ Grid Facet       │
└──────────────┴────────────────────────┴──────────────────┴──────────────────┘
```

### Step 4.1: Modifying Visual Encodings
- **Change Channels**: Drag any column chip from the data shelf into `X`, `Y`, `Color`, `Size`, or `Facet`.
- **Change Aggregations**: Click on a metric chip in the `Y-Axis` shelf to switch between `Sum`, `Mean`, `Median`, `Min`, `Max`, and `Count`.
- **Change Chart Types**: Use the chart selector toolbar above the canvas to switch between Bar, Line, Scatter, Area, Histogram, Box Plot, or ECharts Heatmaps.

---

## 5. AI Style Refinement

Click the **Refine Style (🎨)** button above any chart to open the styling palette:
- **Palette Presets**: Switch between *Techknomatic Executive*, *Emerald Green*, *Vibrant Purple*, *Warm Amber*, and *High-Contrast Dark*.
- **Typography & Gridlines**: Adjust font scale, axis label rotations, tick marks, and subtle gridline contrast.
- **Mark Formatting**: Adjust bar corner radius, point border widths, and opacity sliders.

---

## 6. Authoring Live Interactive Reports

InsightCanvas features an integrated dynamic report authoring environment:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTERACTIVE REPORT EDITOR                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  # Q3 Executive Performance Report                                          │
│  *Prepared by Techknomatic Analytics Team*                                  │
│                                                                             │
│  During Q3 2024, our regional expansion strategy yielded significant gains: │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    [LIVE EMBEDDED CHART: Q3 Sales]                    │  │
│  │                                                                       │  │
│  │  Hover for live tooltips · Zoom · Filter by Region                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Key Takeaways:                                                             │
│  - Regional revenue grew by 24.5% compared to Q2.                           │
│  - Customer retention in the Enterprise segment reached 94.2%.              │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. Click **Reports** in the top navigation bar and select **New Report**.
2. Write headings, formatted paragraphs, bullet points, and LaTeX equations.
3. Click **Insert Visualization** and pick any chart from your active canvas.
4. The embedded chart is **live** — changes made to the underlying source data automatically update inside your report!

---

## 7. Exporting & Sharing
- **Export High-Res Graphics**: Hover over any chart, click the three-dot menu (**⋮**), and select **Save as PNG** or **Save as SVG**.
- **Export Formatted Data**: Click **Download CSV** or **Download Parquet** from any table view.
- **Export Complete Workspace**: Go to **Settings (⚙) → Export Workspace** to download a portable `.zip` archive containing all tables, charts, and data threads.

---

## 8. Intelligence Hub: 1-Click Automated BI Dashboards

**Intelligence Hub** provides autonomous, zero-configuration dashboard synthesis directly from your connected database or imported tables.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTELLIGENCE HUB WORKSPACE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  🏢 [Healthcare Facility Overview]             [STORE / REGION ▼] [All]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Total Revenue│  │ Total Visits │  │ Avg Wait Time│  │ Active Staff │     │
│  │   $4.82M     │  │    1,240     │  │   14.2 min   │  │     185      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐      │
│  │ Visual #1: Monthly Trajectory │   │ Visual #2: Dept Breakdown     │      │
│  │ [Ascending Line Chart]        │   │ [Top 15 Column Chart]         │      │
│  └───────────────────────────────┘   └───────────────────────────────┘      │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐      │
│  │ Visual #3: Revenue Share      │   │ Visual #4: Age Distribution   │      │
│  │ [Top 7 Donut + 'Other']       │   │ [Binned Histogram]            │      │
│  └───────────────────────────────┘   └───────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 8.1: Generating an Automated Dashboard
1. Click **Intelligence Hub** in the top navigation bar.
2. Select any connected database source or table from the catalog.
3. Click any auto-generated **Dashboard Suggestion** chip or type a custom goal into the accent-bar prompt box (e.g. *"Show hospital patient throughput and department revenue"*).
4. InsightCanvas profiles the schemas, builds the `_unified_analytics` view, and synthesizes 4 KPI cards and 6 multi-dimensional charts.

### Step 8.2: Dynamic Slicer Cross-Filtering
- Use the **Slicer Filter Bar** at the top right of the canvas to filter by dimension (e.g. Department, Store, Product Line).
- All 4 KPIs and 6 charts update in real-time without reloading the page.

---

## 9. Executive Intelligence Reports with Embedded Visuals

Generate publication-ready, C-suite strategic intelligence reports with a single click.

### Step 9.1: Generating an Executive Report
1. On your active dashboard in Intelligence Hub, click the **Executive Report** button in the top navigation bar.
2. The AI Strategic Analyst synthesizes an in-depth briefing structured into:
   - **Executive Summary & Strategic Highlights**
   - **KPI Performance Deep-Dive & Root-Cause Attribution**
   - **Multi-Dimensional Visual Analytics Walkthrough**
   - **Cross-Metric Risk Evaluation**
   - **Prioritized Strategic Action Roadmap** (Immediate, 30-Day, 90-Day initiatives)

### Step 9.2: Viewing & Exporting Reports
- **Visual KPI Scorecard**: Rendered at the top of the report with exact formatted values and baseline comparisons.
- **Embedded Visual Charts**: All 6 interactive charts are rendered inline with their respective analysis sections.
- **Download PDF**: Click **Download PDF** or **Print Report** to produce an aligned, multi-page PDF document without browser URL/timestamp headers.
- **Markdown Export**: Click the **Download Markdown (.md)** button to export the raw text for Obsidian, Notion, or internal wikis.

---

## 10. Exporting Dashboards to High-Resolution PDF & Images

1. In the top navigation bar of Intelligence Hub, click **Export (▼)**.
2. Choose your preferred format:
   - **Download PDF**: Produces an upright, high-resolution portrait PDF snapshot of the dashboard.
   - **Download JPG**: High-DPI compressed JPEG snapshot.
   - **Download PNG**: Lossless high-resolution PNG graphic.

---

*InsightCanvas — Built by Techknomatic Services Pvt. Ltd. (support@techknomatic.com)*

