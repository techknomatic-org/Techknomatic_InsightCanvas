# InsightCanvas — User Handbook & Analytics Playbook

**InsightCanvas** by *Techknomatic Services Pvt. Ltd.*

This handbook is a comprehensive reference manual containing prompt engineering templates, chart selection frameworks, visual encoding rules, and best practices.

---

## 1. Prompt Engineering Playbook for InsightCanvas

To get the most accurate and high-performance results from the AI agent, follow these proven prompt patterns:

### 1.1 Data Ingestion & Extraction Prompts
| Goal | Recommended Prompt Structure |
| :--- | :--- |
| **From Image** | *"Extract all columns from this image and format numbers with decimals into standard float format."* |
| **Data Generation** | *"Generate a sample table with 50 rows of synthetic e-commerce sales across 5 regions for 2024."* |
| **URL Load** | *"Fetch the CSV data from https://... and parse the date column using YYYY-MM-DD format."* |

### 1.2 Data Transformation & Cleaning Prompts
| Goal | Recommended Prompt Structure |
| :--- | :--- |
| **Cleaning** | *"Check for missing values in [Column A]. Fill missing values with the median of [Column A] grouped by [Column B]."* |
| **Aggregations** | *"Group by [Category] and [Year], and calculate total revenue, average order value, and customer count."* |
| **Reshaping (Pivoting)** | *"Pivot the table so each unique value in [Metric Name] becomes a separate column with values from [Metric Value]."* |
| **Window Calculations** | *"Compute a 7-day rolling average for daily active users sorted chronologically."* |

### 1.3 Visualization & Styling Prompts
| Goal | Recommended Prompt Structure |
| :--- | :--- |
| **Chart Creation** | *"Create a multi-line chart comparing monthly revenue by region with data points highlighted."* |
| **Style Polish** | *"Refine this chart for executive presentation: use the Techknomatic blue theme, format the Y-axis with dollar currency symbols, and place the legend at the top."* |

---

## 2. Visualization Selection Matrix

Use this matrix to choose the optimal chart type for your analytical goal:

```
┌─────────────────┬──────────────────────────────────┬─────────────────────────────┐
│ ANALYTICAL GOAL │ RECOMMENDED CHART TYPES          │ KEY ENCODING CHANNELS       │
├─────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ Comparison      │ Bar, Grouped Bar, Column, Lollipop│ X: Nominal, Y: Quantitative │
│ Trend over Time │ Line, Area, Streamgraph, Slope   │ X: Temporal, Y: Quantitative│
│ Distribution    │ Histogram, Box Plot, Violin, ECDF│ X: Quantitative / Bin       │
│ Composition     │ Stacked Bar, Pie, Donut, Treemap │ Color: Nominal, Size/Height │
│ Relationship    │ Scatter, Bubble Plot, Heatmap    │ X, Y: Quant, Size: Quant    │
│ Financial / Flow│ Candlestick, Waterfall, Gantt    │ Open/Close/High/Low, Time   │
│ Geospatial      │ Choropleth, Scatter Geo-Points   │ Latitude, Longitude, Color  │
└─────────────────┴──────────────────────────────────┴─────────────────────────────┘
```

---

## 3. Data Types & Visual Encoding Reference

InsightCanvas classifies fields into 4 semantic data types:

1. **Quantitative (`Q`)**:
   - Numeric values representing continuous or discrete measurements (e.g. `Revenue`, `Temperature`, `Quantity`).
   - *Best channels*: Position (`X`, `Y`), `Size`, `Color gradient`, `Opacity`.
2. **Nominal (`N`)**:
   - Unordered categorical labels (e.g. `Country`, `Customer Name`, `Product Category`).
   - *Best channels*: `Color (Categorical)`, `Shape`, `Facet (Rows/Columns)`.
3. **Ordinal (`O`)**:
   - Ordered categorical labels (e.g. `Low / Medium / High`, `Q1 / Q2 / Q3`).
   - *Best channels*: Position, `Color intensity / lightness`.
4. **Temporal (`T`)**:
   - Dates, timestamps, and intervals (e.g. `2024-01-15`, `Q3 2024`).
   - *Best channels*: `X-Axis`, `Facet`.

---

## 4. Understanding Data Threads & Non-Destructive History

InsightCanvas uses a **DAG (Directed Acyclic Graph)** model for data manipulation:
- **Root Tables**: Original imported datasets.
- **Derived Nodes**: Child tables created by AI transformations or SQL filters.
- **Branching**: You can branch off from any point in the history to experiment with alternative transformations without losing your original or intermediate data.

---

## 5. Security & Privacy FAQ

### Q1: Where does my uploaded data reside?
- All table processing and transformations occur **locally in your browser or on your private server backend**. 
- Data is stored in secure Parquet files inside your local user workspace `$DATA_FORMULATOR_HOME`.

### Q2: What data is sent to the LLM (AI model)?
- The LLM receives **only schema column names, types, and small statistical samples** (a few sample rows) to understand table structure and write the transformation code.
- Your entire database or full dataset is **never** uploaded to the LLM provider.

### Q3: How is Python code executed safely?
- All generated code is run inside a **sandboxed Python environment** with restricted permissions and timeouts.

---

## 6. Keyboard Shortcuts & Pro-Tips

| Shortcut / Action | Function |
| :--- | :--- |
| **Shift + Enter** | Insert a newline in the AI prompt box without submitting |
| **Enter** | Submit prompt to the AI agent |
| **Tab** | Accept autocomplete prompt suggestions |
| **Drag & Drop File** | Instantly attach and load dataset into the prompt box |
| **Paste Image (Ctrl+V)** | Extract data from screenshot directly into a table |

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
