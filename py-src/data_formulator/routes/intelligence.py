# Copyright (c) Techknomatic Services Pvt Ltd.
# Licensed under the MIT License.

"""Intelligence Hub API blueprint.

Provides data-driven intelligent dashboard generation, dataset profiling,
AI suggestions, DuckDB-powered multi-table query execution, and session management.
"""

import difflib
import json
import logging
import math
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import duckdb
import numpy as np
import pandas as pd
from flask import Blueprint, current_app, request

from data_formulator.agent_config import reasoning_effort_for
from data_formulator.agents.agent_language import build_language_instruction, inject_language_instruction
from data_formulator.agents.agent_utils import extract_json_objects
from data_formulator.agents.client_utils import Client
from data_formulator.auth.identity import get_identity_id
from data_formulator.datalake.parquet_utils import df_to_safe_records, make_json_safe, sanitize_table_name
from data_formulator.datalake.workspace import Workspace, get_user_home
from data_formulator.error_handler import classify_and_wrap_llm_error, json_ok
from data_formulator.errors import AppError, ErrorCode
from data_formulator.model_registry import model_registry
from data_formulator.workspace_factory import get_workspace_manager, get_active_workspace_id

logger = logging.getLogger(__name__)

intelligence_bp = Blueprint("intelligence", __name__, url_prefix="/api/intelligence")


def _get_ui_lang() -> str:
    """Extract the primary language code from the Accept-Language header."""
    return request.headers.get("Accept-Language", "en").split(",")[0].split("-")[0].strip().lower()


def _get_client_from_request(model_config: dict[str, Any] | None) -> Any:
    """Resolve LiteLLM client from request model config."""
    from data_formulator.routes.agents import get_client
    if not model_config:
        global_models = model_registry.list_configs()
        if global_models:
            return get_client(global_models[0], trusted=True)
        raise AppError(ErrorCode.INVALID_REQUEST, "Model configuration is required")
    return get_client(model_config)


def _get_sessions_dir(identity_id: str) -> Path:
    """Directory for persisting Intelligence Hub dashboard sessions."""
    home = get_user_home(identity_id)
    s_dir = home / "intelligence_sessions"
    s_dir.mkdir(parents=True, exist_ok=True)
    return s_dir


def _get_or_create_workspace(identity_id: str, requested_ws_id: str | None = None) -> Workspace:
    """Get active workspace from request body/header or create a default user workspace."""
    ws_id = requested_ws_id or get_active_workspace_id() or f"intelligence_hub_{identity_id.replace(':', '_')}"
    mgr = get_workspace_manager(identity_id)
    if not mgr.workspace_exists(ws_id):
        # Check if user has an existing active session workspace with data
        existing_workspaces = mgr.list_workspaces()
        for candidate_id in reversed(existing_workspaces):
            try:
                candidate_ws = mgr.open_workspace(candidate_id, identity_id)
                if len(candidate_ws.list_tables()) > 0:
                    logger.info("Found tables in existing workspace '%s'", candidate_id)
                    return candidate_ws
            except Exception:
                pass
        mgr.create_workspace(ws_id)
    return mgr.open_workspace(ws_id, identity_id)


# ---------------------------------------------------------------------------
# Data Profiling Engine
# ---------------------------------------------------------------------------

def _profile_table(workspace: Workspace, table_name: str) -> dict[str, Any]:
    """Profile a table in the workspace using DuckDB/pandas via Workspace API."""
    resolved_name = None
    for t in workspace.list_tables():
        if t == table_name or t.lower() == table_name.lower():
            resolved_name = t
            break

    if not resolved_name:
        safe = sanitize_table_name(table_name)
        for t in workspace.list_tables():
            if t == safe or t.lower() == safe.lower():
                resolved_name = t
                break

    if not resolved_name:
        meta = workspace.get_table_metadata(table_name)
        if meta:
            resolved_name = meta.name

    if not resolved_name:
        raise AppError(ErrorCode.NOT_FOUND, f"Table '{table_name}' not found in workspace. Available tables: {workspace.list_tables()}")

    table_name = resolved_name

    sample_df = pd.DataFrame()
    total_rows = 0
    schema_df = pd.DataFrame()

    # Try fast DuckDB parquet profiling first
    try:
        parquet_path = workspace.get_parquet_path(table_name)
        p_str = str(parquet_path).replace("\\", "/")
        con = duckdb.connect(":memory:")
        try:
            table_esc = f"read_parquet('{p_str}')"
            row_count_res = con.execute(f"SELECT COUNT(*) FROM {table_esc}").fetchone()
            total_rows = int(row_count_res[0]) if row_count_res else 0

            schema_df = con.execute(f"DESCRIBE SELECT * FROM {table_esc}").df()
            sample_limit = min(500, max(50, total_rows)) if total_rows > 0 else 0
            sample_df = con.execute(f"SELECT * FROM {table_esc} LIMIT {sample_limit}").df() if sample_limit > 0 else pd.DataFrame()
        finally:
            con.close()
    except Exception as exc:
        logger.info("Direct DuckDB parquet profiling for '%s' (%s), using workspace.read_data_as_df", table_name, exc)
        try:
            sample_df = workspace.read_data_as_df(table_name)
            total_rows = len(sample_df)
            schema_df = pd.DataFrame([
                {"column_name": col, "column_type": str(dtype)}
                for col, dtype in sample_df.dtypes.items()
            ])
            sample_df = sample_df.head(500)
        except Exception as df_err:
            raise AppError(ErrorCode.DATA_LOAD_ERROR, f"Could not read table '{table_name}': {df_err}") from df_err


    columns_profile = []
    measures = []
    dimensions = []
    temporal_columns = []

    for _, row in schema_df.iterrows():
        col_name = str(row["column_name"])
        col_type = str(row["column_type"]).upper()

        series = sample_df[col_name] if col_name in sample_df.columns else pd.Series()
        null_count = int(series.isna().sum()) if len(series) > 0 else 0
        null_pct = round((null_count / len(series)) * 100, 1) if len(series) > 0 else 0.0

        distinct_vals = series.dropna().unique()
        distinct_count = len(distinct_vals)

        semantic_type = "categorical"
        is_measure = False
        is_temporal = False
        is_dimension = False

        if any(t in col_type for t in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT", "REAL", "HUGEINT")):
            lower_name = col_name.lower()
            if distinct_count > 1 and not (lower_name.endswith("_id") or lower_name == "id" or lower_name.endswith("code") or lower_name.endswith("zip") or lower_name.endswith("_key")):
                semantic_type = "numeric"
                is_measure = True
                measures.append(col_name)
            else:
                semantic_type = "identifier"
                is_dimension = True
                dimensions.append(col_name)
        elif any(t in col_type for t in ("DATE", "TIME", "TIMESTAMP")):
            semantic_type = "temporal"
            is_temporal = True
            temporal_columns.append(col_name)
            dimensions.append(col_name)
        elif "BOOL" in col_type:
            semantic_type = "boolean"
            is_dimension = True
            dimensions.append(col_name)
        else:
            lower_name = col_name.lower()
            if any(k in lower_name for k in ("date", "time", "year", "month", "day", "created_at", "timestamp")):
                semantic_type = "temporal"
                is_temporal = True
                temporal_columns.append(col_name)
            else:
                semantic_type = "categorical"
            is_dimension = True
            dimensions.append(col_name)

        sample_vals = [make_json_safe(v) for v in distinct_vals[:5]]

        columns_profile.append({
            "name": col_name,
            "type": col_type,
            "semantic_type": semantic_type,
            "is_measure": is_measure,
            "is_dimension": is_dimension,
            "is_temporal": is_temporal,
            "null_count": null_count,
            "null_percentage": null_pct,
            "distinct_count": distinct_count,
            "sample_values": sample_vals,
        })

    sample_records = df_to_safe_records(sample_df.head(5))

    return {
        "table_name": table_name,
        "row_count": total_rows,
        "columns": columns_profile,
        "measures": measures,
        "dimensions": dimensions,
        "temporal_columns": temporal_columns,
        "sample_records": sample_records,
    }


def _build_full_profile(workspace: Workspace, table_names: list[str]) -> dict[str, Any]:
    """Generate comprehensive dataset profile across all selected tables."""
    tables_profile = []
    for t_name in table_names:
        try:
            p = _profile_table(workspace, t_name)
            tables_profile.append(p)
        except Exception as exc:
            logger.warning("Failed to profile table '%s': %s", t_name, exc)

    if not tables_profile:
        raise AppError(ErrorCode.DATA_LOAD_ERROR, f"None of the selected tables ({', '.join(table_names)}) could be profiled")

    # Inferred relationships
    relationships = []
    for i in range(len(tables_profile)):
        for j in range(i + 1, len(tables_profile)):
            t1 = tables_profile[i]
            t2 = tables_profile[j]
            cols1 = {c["name"].lower(): c["name"] for c in t1["columns"]}
            cols2 = {c["name"].lower(): c["name"] for c in t2["columns"]}
            common = set(cols1.keys()).intersection(set(cols2.keys()))
            for c_low in common:
                if c_low.endswith("_id") or c_low == "id" or "code" in c_low or "key" in c_low or c_low.endswith("_key"):
                    relationships.append({
                        "table1": t1["table_name"],
                        "column1": cols1[c_low],
                        "table2": t2["table_name"],
                        "column2": cols2[c_low],
                        "confidence": "high",
                    })

    return {
        "tables": tables_profile,
        "table_count": len(tables_profile),
        "total_rows": sum(t["row_count"] for t in tables_profile),
        "inferred_relationships": relationships,
    }


# ---------------------------------------------------------------------------
# LLM Accuracy Helpers: Spec Stripping, Column Inventory & Validation
# ---------------------------------------------------------------------------

def _strip_spec_for_llm(spec: dict[str, Any]) -> dict[str, Any]:
    """Remove hydrated data, vega specs, and computed values from a dashboard
    spec so the LLM only sees the structural definition it needs to modify."""
    stripped = {
        "title": spec.get("title"),
        "description": spec.get("description"),
        "filter": {
            "table": spec.get("filter", {}).get("table"),
            "field": spec.get("filter", {}).get("field"),
            "label": spec.get("filter", {}).get("label"),
            "selected_value": spec.get("filter", {}).get("selected_value"),
        },
    }
    stripped["kpis"] = []
    for kpi in spec.get("kpis", []):
        stripped["kpis"].append({
            "id": kpi.get("id"),
            "title": kpi.get("title"),
            "table": kpi.get("table"),
            "measure_column": kpi.get("measure_column"),
            "aggregation": kpi.get("aggregation"),
            "format": kpi.get("format"),
            "subtitle": kpi.get("subtitle"),
            "comparison": kpi.get("comparison"),
        })
    stripped["visualizations"] = []
    for viz in spec.get("visualizations", []):
        stripped["visualizations"].append({
            "id": viz.get("id"),
            "title": viz.get("title"),
            "description": viz.get("description"),
            "table": viz.get("table"),
            "chart_type": viz.get("chart_type"),
            "x_field": viz.get("x_field"),
            "y_field": viz.get("y_field"),
            "color_field": viz.get("color_field"),
            "aggregation": viz.get("aggregation"),
        })
    return stripped


def _build_column_inventory(profile: dict[str, Any] | None) -> str:
    """Build a human-readable column inventory from the data profile.

    Returns a formatted text block listing every table with its columns,
    types, semantic roles and sample values so the LLM knows exactly what
    columns are available."""
    if not profile or not profile.get("tables"):
        return "No column inventory available."
    lines: list[str] = []
    for t in profile["tables"]:
        t_name = t.get("table_name", "unknown")
        lines.append(f"\n### Table: {t_name}  (rows: {t.get('row_count', '?')})")
        lines.append(f"  Measures: {', '.join(t.get('measures', [])) or 'none'}")
        lines.append(f"  Dimensions: {', '.join(t.get('dimensions', [])) or 'none'}")
        lines.append(f"  Temporal: {', '.join(t.get('temporal_columns', [])) or 'none'}")
        lines.append("  Columns:")
        for c in t.get("columns", []):
            sample = ", ".join(str(v) for v in c.get("sample_values", [])[:3])
            distinct = c.get("distinct_count", "?")
            lines.append(f"    - {c['name']}  type={c.get('type','?')}  semantic={c.get('semantic_type','?')}  distinct={distinct}  samples=[{sample}]")
    return "\n".join(lines)


def _validate_and_fix_spec(
    spec: dict[str, Any],
    profile: dict[str, Any] | None,
) -> dict[str, Any]:
    """Validate column references in a dashboard spec and auto-correct
    near-misses using fuzzy matching against the actual schema."""
    if not profile or not profile.get("tables"):
        return spec

    # Build lookup: table_name -> set of column names
    table_col_sets: dict[str, set[str]] = {}
    all_columns: set[str] = set()
    all_columns_list: list[str] = []
    for t in profile["tables"]:
        t_name = t.get("table_name", "")
        cols = {c["name"] for c in t.get("columns", [])}
        table_col_sets[t_name] = cols
        all_columns.update(cols)
        all_columns_list.extend(cols)

    # De-duplicate the list but preserve order
    seen: set[str] = set()
    unique_cols: list[str] = []
    for c in all_columns_list:
        if c not in seen:
            unique_cols.append(c)
            seen.add(c)

    def _fuzzy_fix(col_name: str | None, table_name: str | None = None) -> str | None:
        if not col_name:
            return col_name
        # Exact match
        if col_name in all_columns:
            return col_name
        # Case-insensitive match
        lower_map = {c.lower(): c for c in all_columns}
        if col_name.lower() in lower_map:
            fixed = lower_map[col_name.lower()]
            logger.info("Column auto-fix: '%s' -> '%s' (case)", col_name, fixed)
            return fixed
        # Fuzzy match
        candidates = unique_cols
        if table_name and table_name in table_col_sets:
            candidates = list(table_col_sets[table_name])
        matches = difflib.get_close_matches(col_name.lower(), [c.lower() for c in candidates], n=1, cutoff=0.6)
        if matches:
            # Map back to original casing
            fixed = lower_map.get(matches[0], col_name)
            logger.info("Column auto-fix: '%s' -> '%s' (fuzzy)", col_name, fixed)
            return fixed
        logger.warning("Column '%s' not found in schema and no fuzzy match available", col_name)
        return col_name

    # Fix filter
    flt = spec.get("filter") or {}
    if flt.get("field"):
        flt["field"] = _fuzzy_fix(flt["field"], flt.get("table"))
    spec["filter"] = flt

    # Fix KPIs
    for kpi in spec.get("kpis", []):
        kpi["measure_column"] = _fuzzy_fix(kpi.get("measure_column"), kpi.get("table"))

    # Fix visualizations
    for viz in spec.get("visualizations", []):
        viz["x_field"] = _fuzzy_fix(viz.get("x_field"), viz.get("table"))
        viz["y_field"] = _fuzzy_fix(viz.get("y_field"), viz.get("table"))
        viz["color_field"] = _fuzzy_fix(viz.get("color_field"), viz.get("table"))

    return spec


# ---------------------------------------------------------------------------
# Multi-Table Unified Relational Engine
# ---------------------------------------------------------------------------

def _setup_unified_duckdb_views(workspace: Workspace, con: duckdb.DuckDBPyConnection) -> dict[str, Any]:
    """Register all workspace tables in DuckDB and synthesize a unified joined model."""
    table_columns: dict[str, list[str]] = {}
    table_column_types: dict[str, dict[str, str]] = {}  # table -> {col_name: col_type}
    table_rows: dict[str, int] = {}
    table_names = workspace.list_tables()

    for t_name in table_names:
        try:
            p_path = workspace.get_parquet_path(t_name)
            p_str = str(p_path).replace("\\", "/")
            con.execute(f"CREATE OR REPLACE VIEW \"{t_name}\" AS SELECT * FROM read_parquet('{p_str}')")
            schema_df = con.execute(f"DESCRIBE SELECT * FROM \"{t_name}\"").df()
            col_names = [str(c) for c in schema_df["column_name"].tolist()]
            col_types = [str(t).upper() for t in schema_df["column_type"].tolist()]
            table_columns[t_name] = col_names
            table_column_types[t_name] = dict(zip(col_names, col_types))
            r_cnt = con.execute(f"SELECT COUNT(*) FROM \"{t_name}\"").fetchone()
            table_rows[t_name] = int(r_cnt[0]) if r_cnt else 0
        except Exception as e:
            logger.warning("Could not register view for table '%s': %s", t_name, e)

    # Detect central fact table (table with highest row count or prefix 'fact' or most measures)
    fact_table = None
    if table_names:
        for t in table_names:
            if t.lower().startswith("fact"):
                fact_table = t
                break
        if not fact_table:
            fact_table = max(table_names, key=lambda t: table_rows.get(t, 0))

    # Build automated unified view if multiple tables exist
    unified_columns: set[str] = set()
    if fact_table and len(table_names) > 1:
        fact_cols = set(table_columns.get(fact_table, []))
        select_parts = [f'"{fact_table}".*']
        unified_columns.update(fact_cols)
        join_clauses = []

        for dim_table in table_names:
            if dim_table == fact_table:
                continue
            dim_cols = table_columns.get(dim_table, [])
            # Find matching join key
            join_key = None
            for dc in dim_cols:
                for fc in fact_cols:
                    if dc.lower() == fc.lower() and (dc.lower().endswith("_id") or dc.lower() == "id" or dc.lower().endswith("_key") or dc.lower().endswith("code")):
                        join_key = (fc, dc)
                        break
                if join_key:
                    break

            if join_key:
                fc, dc = join_key
                join_clauses.append(f'LEFT JOIN "{dim_table}" ON "{fact_table}"."{fc}" = "{dim_table}"."{dc}"')
                for c in dim_cols:
                    if c not in unified_columns:
                        select_parts.append(f'"{dim_table}"."{c}" AS "{c}"')
                        unified_columns.add(c)
                    elif c != dc:
                        alias = f"{dim_table}_{c}"
                        select_parts.append(f'"{dim_table}"."{c}" AS "{alias}"')
                        unified_columns.add(alias)

        if join_clauses:
            select_str = ", ".join(select_parts)
            joins_str = " ".join(join_clauses)
            unified_sql = f'CREATE OR REPLACE VIEW "_unified_analytics" AS SELECT {select_str} FROM "{fact_table}" {joins_str}'
            try:
                con.execute(unified_sql)
                logger.info("Successfully created _unified_analytics view across %d tables", len(table_names))
            except Exception as e:
                logger.warning("Failed to create _unified_analytics view: %s", e)

    return {
        "table_columns": table_columns,
        "table_column_types": table_column_types,
        "fact_table": fact_table,
        "unified_columns": unified_columns,
    }


def _execute_safe_query(con: duckdb.DuckDBPyConnection, sql: str) -> pd.DataFrame:
    """Execute a read-only DuckDB SQL query safely."""
    clean_sql = sql.strip().rstrip(";")
    forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "ATTACH", "DETACH", "PRAGMA", "COPY", "EXPORT", "IMPORT"]
    first_token = clean_sql.split()[0].upper() if clean_sql else ""
    if first_token not in ("SELECT", "WITH", "DESCRIBE"):
        raise ValueError(f"Forbidden statement type: {first_token}. Only SELECT queries are permitted.")
    for kw in forbidden:
        if re.search(rf"\b{kw}\b", clean_sql, re.IGNORECASE) and not re.search(rf"['\"].*\b{kw}\b.*['\"]", clean_sql, re.IGNORECASE):
            if kw != "SELECT":
                raise ValueError(f"Forbidden keyword in analytical query: {kw}")
    return con.execute(clean_sql).df()


def _format_metric_value(val: Any, format_type: str = "number") -> tuple[str, float | int | None]:
    """Format raw KPI scalar values for presentation."""
    if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return "N/A", None

    try:
        num = float(val)
    except (ValueError, TypeError):
        return str(val), None

    if format_type == "currency":
        if abs(num) >= 1_000_000_000:
            return f"${num / 1_000_000_000:.2f}B", num
        if abs(num) >= 1_000_000:
            return f"${num / 1_000_000:.2f}M", num
        if abs(num) >= 1_000:
            return f"${num / 1_000:.1f}K", num
        return f"${num:,.2f}", num
    elif format_type == "percent":
        return f"{num:.1f}%", num
    elif format_type == "integer":
        return f"{int(round(num)):,}", int(round(num))
    else:
        if abs(num) >= 1_000_000_000:
            return f"{num / 1_000_000_000:.2f}B", num
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K", num
        if num == int(num):
            return f"{int(num):,}", int(num)
        return f"{num:.2f}", num


def _build_vega_lite_spec(
    chart_title: str,
    chart_type: str,
    x_field: str | None,
    y_field: str | None,
    color_field: str | None,
    data_records: list[dict[str, Any]],
    is_temporal: bool = False,
) -> dict[str, Any]:
    """Assemble a modern, visually stunning Vega-Lite specification."""
    c_type = (chart_type or "bar").lower()

    # Premium curated color palette
    color_range = ["#1B75BB", "#00B4D8", "#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#06B6D4"]

    mark: Any = "bar"
    if c_type in ("bar", "column"):
        mark = {
            "type": "bar",
            "cornerRadiusEnd": 6,
            "color": "#1B75BB",
        }
    elif c_type == "line":
        mark = {
            "type": "line",
            "interpolate": "monotone",
            "strokeWidth": 2.5,
            "color": "#1B75BB",
            "point": {"filled": True, "size": 36, "fill": "#1B75BB"},
        }
    elif c_type == "area":
        mark = {
            "type": "area",
            "interpolate": "monotone",
            "opacity": 0.28,
            "color": "#1B75BB",
            "line": {"color": "#1B75BB", "width": 2.5},
        }
    elif c_type in ("scatter", "point"):
        mark = {
            "type": "point",
            "size": 60,
            "filled": True,
            "opacity": 0.8,
            "color": "#1B75BB",
        }
    elif c_type in ("donut", "pie"):
        mark = {
            "type": "arc",
            "innerRadius": 50 if c_type == "donut" else 0,
            "padAngle": 0.03,
            "cornerRadius": 4,
        }

    encoding: dict[str, Any] = {}

    if c_type in ("pie", "donut"):
        if y_field:
            encoding["theta"] = {"field": y_field, "type": "quantitative"}
        if x_field:
            encoding["color"] = {
                "field": x_field,
                "type": "nominal",
                "scale": {"range": color_range},
                "legend": {"orient": "bottom", "columns": 3, "labelFontSize": 11, "title": None},
            }
    else:
        if x_field:
            # Use temporal type for date/time fields — clean, readable axis labels
            if is_temporal:
                encoding["x"] = {
                    "field": x_field,
                    "type": "temporal",
                    "axis": {
                        "format": "%b %Y",
                        "labelAngle": -30,
                        "labelLimit": 110,
                        "labelColor": "#64748b",
                        "tickColor": "#cbd5e1",
                        "domainColor": "#cbd5e1",
                        "title": None,
                        "tickCount": {"interval": "month", "step": 1} if len(data_records) <= 12 else {"interval": "month", "step": 3},
                    },
                }
            else:
                encoding["x"] = {
                    "field": x_field,
                    "type": "nominal" if c_type in ("bar", "column") else "ordinal",
                    "axis": {
                        "labelAngle": -25 if len(data_records) > 5 else 0,
                        "labelLimit": 110,
                        "labelColor": "#64748b",
                        "tickColor": "#cbd5e1",
                        "domainColor": "#cbd5e1",
                        "title": None,
                    },
                }
        if y_field:
            encoding["y"] = {
                "field": y_field,
                "type": "quantitative",
                "axis": {
                    "grid": True,
                    "gridColor": "#f1f5f9",
                    "labelColor": "#64748b",
                    "tickColor": "#cbd5e1",
                    "domainColor": "#cbd5e1",
                    "title": None,
                },
            }
        if color_field and color_field != x_field:
            encoding["color"] = {
                "field": color_field,
                "type": "nominal",
                "scale": {"range": color_range},
                "legend": {"orient": "bottom", "title": None},
            }

    tooltip = []
    if x_field:
        x_tooltip_type = "temporal" if is_temporal else "nominal"
        tooltip.append({"field": x_field, "type": x_tooltip_type, "title": str(x_field).replace("_", " ").title()})
    if y_field:
        tooltip.append({"field": y_field, "type": "quantitative", "title": str(y_field).replace("_", " ").title()})
    if color_field and color_field not in (x_field, y_field):
        tooltip.append({"field": color_field, "type": "nominal", "title": str(color_field).replace("_", " ").title()})
    if tooltip:
        encoding["tooltip"] = tooltip

    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": {
            "text": chart_title,
            "anchor": "start",
            "fontSize": 13,
            "fontWeight": 700,
            "color": "#0f172a",
        },
        "width": "container",
        "height": 220,
        "mark": mark,
        "encoding": encoding,
        "data": {"values": data_records},
        "config": {
            "view": {"stroke": "transparent"},
            "font": "Inter, Roboto, sans-serif",
            "axis": {"domainColor": "#e2e8f0", "tickColor": "#e2e8f0"},
        },
    }


def _hydrate_dashboard_spec(
    workspace: Workspace,
    spec: dict[str, Any],
    filter_value: str | None = "All",
) -> dict[str, Any]:
    """Execute queries and hydrate KPIs, filters, and charts with live data."""
    con = duckdb.connect(":memory:")
    try:
        model_info = _setup_unified_duckdb_views(workspace, con)
        table_columns = model_info["table_columns"]
        table_column_types = model_info["table_column_types"]
        unified_cols = model_info["unified_columns"]

        # Build a global column -> type lookup for temporal detection
        all_col_types: dict[str, str] = {}
        for _t_cols in table_column_types.values():
            all_col_types.update(_t_cols)

        # Helper to resolve table for columns
        def _find_query_source(cols: list[str]) -> str:
            # Check if all columns exist in a single table
            for t_name, t_cols in table_columns.items():
                if all(c in t_cols for c in cols if c):
                    return f'"{t_name}"'
            # If unified analytics view exists and has columns, use it
            if unified_cols and all(c in unified_cols for c in cols if c):
                return '"_unified_analytics"'
            # Fallback to first table that contains any column or default
            for t_name, t_cols in table_columns.items():
                if any(c in t_cols for c in cols if c):
                    return f'"{t_name}"'
            first_tbl = list(table_columns.keys())[0] if table_columns else "data"
            return f'"{first_tbl}"'

        # 1. Hydrate Filter Options
        filter_spec = spec.get("filter") or {}
        filter_field = filter_spec.get("field")
        filter_table = filter_spec.get("table")

        filter_options = ["All"]
        if filter_field:
            filter_src = _find_query_source([filter_field]) if not filter_table else f'"{filter_table}"'
            try:
                opt_df = _execute_safe_query(
                    con,
                    f"SELECT DISTINCT \"{filter_field}\" AS val FROM {filter_src} WHERE \"{filter_field}\" IS NOT NULL ORDER BY val LIMIT 100",
                )
                raw_opts = opt_df["val"].dropna().tolist()
                filter_options = ["All"] + [str(v) for v in raw_opts]
            except Exception as e:
                logger.warning("Failed to fetch filter options: %s", e)

        filter_spec["options"] = filter_options
        filter_spec["selected_value"] = filter_value or "All"
        spec["filter"] = filter_spec

        filter_active = filter_value and str(filter_value).strip().lower() not in ("all", "", "none")

        # 2. Hydrate Exactly 4 KPIs
        hydrated_kpis = []
        for kpi in spec.get("kpis", [])[:4]:
            t_name = kpi.get("table")
            measure = kpi.get("measure_column")
            agg = (kpi.get("aggregation") or "SUM").upper()
            fmt = kpi.get("format") or "number"

            # Smart aggregation override based on column semantics
            if measure:
                m_lower = measure.lower()
                if any(k in m_lower for k in ("rate", "percent", "ratio", "efficiency", "utilization", "score", "average", "avg", "pct")):
                    if agg == "SUM":
                        agg = "AVG"
                        logger.info("Smart agg override: '%s' changed SUM→AVG (rate/percent/score column)", measure)
                if any(k in m_lower for k in ("_id", "_key")) or m_lower in ("id", "key"):
                    if agg in ("SUM", "AVG"):
                        agg = "COUNT"
                        logger.info("Smart agg override: '%s' changed %s→COUNT (ID/key column)", measure, kpi.get("aggregation"))
                # Auto-fix format based on column name
                if any(k in m_lower for k in ("rate", "percent", "pct", "ratio")) and fmt not in ("percent",):
                    fmt = "percent"
                elif any(k in m_lower for k in ("cost", "price", "revenue", "salary", "wage", "budget", "spend")) and fmt not in ("currency",):
                    fmt = "currency"

            val_formatted = "N/A"
            raw_val = None

            if measure:
                # Find appropriate source table/view
                target_src = _find_query_source([measure, filter_field] if filter_active and filter_field else [measure])

                where_clause = ""
                if filter_active and filter_field:
                    escaped_val = str(filter_value).replace("'", "''")
                    where_clause = f"WHERE \"{filter_field}\" = '{escaped_val}'"

                # Check if measure is ID or distinct count is preferred
                agg_expr = f"{agg}(\"{measure}\")"
                if agg in ("COUNT", "DISTINCT_COUNT") or measure.lower().endswith("_id") or measure.lower() == "id" or measure.lower().endswith("_key"):
                    agg_expr = f"COUNT(DISTINCT \"{measure}\")" if agg != "SUM" else f"COUNT(\"{measure}\")"

                sql = f"SELECT {agg_expr} AS kpi_val FROM {target_src} {where_clause}"
                try:
                    k_df = _execute_safe_query(con, sql)
                    if not k_df.empty:
                        raw_val = k_df.iloc[0]["kpi_val"]
                        val_formatted, raw_val = _format_metric_value(raw_val, fmt)
                except Exception as e:
                    # Fallback without where clause if filter column caused mismatch
                    try:
                        fallback_sql = f"SELECT {agg_expr} AS kpi_val FROM {target_src}"
                        k_df = _execute_safe_query(con, fallback_sql)
                        if not k_df.empty:
                            raw_val = k_df.iloc[0]["kpi_val"]
                            val_formatted, raw_val = _format_metric_value(raw_val, fmt)
                    except Exception as fb_err:
                        logger.warning("Error calculating KPI '%s': %s", kpi.get("title"), fb_err)

            hydrated_kpis.append({
                "id": kpi.get("id", str(uuid.uuid4())),
                "title": kpi.get("title", "KPI Metric"),
                "table": t_name,
                "measure_column": measure,
                "aggregation": agg,
                "format": fmt,
                "formatted_value": val_formatted,
                "raw_value": make_json_safe(raw_val),
                "subtitle": kpi.get("subtitle", f"{agg} of {measure}"),
                "comparison": kpi.get("comparison", ""),
            })

        while len(hydrated_kpis) < 4:
            hydrated_kpis.append({
                "id": f"kpi_pad_{len(hydrated_kpis)}",
                "title": f"Summary Metric {len(hydrated_kpis)+1}",
                "formatted_value": "—",
                "raw_value": 0,
                "subtitle": "No data",
                "comparison": "",
            })

        spec["kpis"] = hydrated_kpis
        # 3. Hydrate Exactly 6 Visualizations
        # Build a fast column-existence lookup from registered DuckDB views
        all_known_cols: set[str] = set()
        for cols_list in table_columns.values():
            all_known_cols.update(cols_list)
        all_known_cols.update(unified_cols)

        hydrated_visuals = []
        for viz in spec.get("visualizations", [])[:6]:
            v_title = viz.get("title", "Chart")
            t_name = viz.get("table")
            c_type = viz.get("chart_type", "bar")
            x_col = viz.get("x_field")
            y_col = viz.get("y_field")
            color_col = viz.get("color_field")
            agg = (viz.get("aggregation") or "SUM").upper()

            # Smart aggregation override for y-axis based on column semantics
            if y_col:
                y_lower = y_col.lower()
                if any(k in y_lower for k in ("rate", "percent", "ratio", "efficiency", "utilization", "score", "average", "avg", "pct")):
                    if agg == "SUM":
                        agg = "AVG"

            records = []
            query_status = "ok"
            query_error_detail = ""
            x_is_temporal = False

            # Detect if x_col is a temporal (date/time/timestamp) column
            if x_col:
                x_col_type = all_col_types.get(x_col, "").upper()
                x_col_lower = x_col.lower()
                if any(t in x_col_type for t in ("DATE", "TIME", "TIMESTAMP")) or \
                   any(k in x_col_lower for k in ("date", "time", "timestamp", "created_at", "updated_at")):
                    x_is_temporal = True

            # Pre-flight: check column existence
            missing_cols = []
            for col_name, col_label in [(x_col, "x_field"), (y_col, "y_field")]:
                if col_name and col_name not in all_known_cols:
                    missing_cols.append(f"{col_label}='{col_name}'")
            if missing_cols:
                query_status = "column_not_found"
                query_error_detail = f"Missing columns: {', '.join(missing_cols)}"
                logger.warning("Chart '%s': %s", v_title, query_error_detail)

            if x_col and y_col and query_status == "ok":
                needed_cols = [x_col, y_col]
                if color_col and color_col in all_known_cols:
                    needed_cols.append(color_col)
                elif color_col and color_col not in all_known_cols:
                    color_col = None  # Drop invalid color field silently
                if filter_active and filter_field:
                    needed_cols.append(filter_field)

                target_src = _find_query_source(needed_cols)

                where_clause = ""
                if filter_active and filter_field:
                    escaped_val = str(filter_value).replace("'", "''")
                    where_clause = f"WHERE \"{filter_field}\" = '{escaped_val}'"

                # Proper aggregation expression
                clean_agg = agg.upper()
                if "DISTINCT" in clean_agg or "UNIQUE" in clean_agg:
                    y_agg_expr = f'COUNT(DISTINCT "{y_col}")'
                elif clean_agg in ("COUNT",):
                    y_agg_expr = f'COUNT("{y_col}")'
                elif clean_agg in ("AVG", "AVERAGE", "MEAN"):
                    y_agg_expr = f'AVG("{y_col}")'
                elif clean_agg in ("MIN", "MINIMUM"):
                    y_agg_expr = f'MIN("{y_col}")'
                elif clean_agg in ("MAX", "MAXIMUM"):
                    y_agg_expr = f'MAX("{y_col}")'
                else:
                    y_agg_expr = f'SUM("{y_col}")'

                # ── BI Best Practice: Smart query construction per chart type ──
                if c_type in ("pie", "donut"):
                    # Pie/Donut: limit to top 7 slices, group the rest as "Other"
                    inner_sql = f"""
                    SELECT \"{x_col}\", {y_agg_expr} AS \"{y_col}\"
                    FROM {target_src}
                    {where_clause}
                    GROUP BY \"{x_col}\"
                    ORDER BY \"{y_col}\" DESC
                    """
                    sql = f"""
                    WITH ranked AS (
                        {inner_sql}
                    ),
                    top_n AS (
                        SELECT *, ROW_NUMBER() OVER (ORDER BY \"{y_col}\" DESC) AS rn
                        FROM ranked
                    )
                    SELECT
                        CASE WHEN rn <= 7 THEN \"{x_col}\"::VARCHAR ELSE 'Other' END AS \"{x_col}\",
                        SUM(\"{y_col}\") AS \"{y_col}\"
                    FROM top_n
                    GROUP BY CASE WHEN rn <= 7 THEN \"{x_col}\"::VARCHAR ELSE 'Other' END
                    ORDER BY \"{y_col}\" DESC
                    """
                elif x_is_temporal and c_type in ("line", "area"):
                    # Temporal line/area: aggregate to month level, sort ascending
                    group_cols_parts = [f'DATE_TRUNC(\'month\', \"{x_col}\"::TIMESTAMP) AS \"{x_col}\"']
                    group_by_parts = [f'DATE_TRUNC(\'month\', \"{x_col}\"::TIMESTAMP)']
                    if color_col and color_col != x_col:
                        group_cols_parts.append(f'\"{color_col}\"')
                        group_by_parts.append(f'\"{color_col}\"')
                    select_str = ", ".join(group_cols_parts)
                    group_by_str = ", ".join(group_by_parts)
                    sql = f"""
                    SELECT {select_str}, {y_agg_expr} AS \"{y_col}\"
                    FROM {target_src}
                    {where_clause}
                    GROUP BY {group_by_str}
                    ORDER BY \"{x_col}\" ASC
                    LIMIT 36
                    """
                else:
                    # Bar/scatter/other: standard categorical query, top N
                    row_limit = 15 if c_type in ("bar", "column") else 30
                    group_cols = [f'"{x_col}"']
                    if color_col and color_col != x_col:
                        group_cols.append(f'"{color_col}"')
                    group_str = ", ".join(group_cols)
                    sql = f"""
                    SELECT {group_str}, {y_agg_expr} AS "{y_col}"
                    FROM {target_src}
                    {where_clause}
                    GROUP BY {group_str}
                    ORDER BY "{y_col}" DESC
                    LIMIT {row_limit}
                    """

                try:
                    v_df = _execute_safe_query(con, sql)
                    records = df_to_safe_records(v_df)
                    if not records:
                        query_status = "no_data"
                except Exception as e:
                    # Fallback: simple query without temporal aggregation or where clause
                    try:
                        group_cols_fb = [f'"{x_col}"']
                        if color_col and color_col != x_col:
                            group_cols_fb.append(f'"{color_col}"')
                        group_str_fb = ", ".join(group_cols_fb)
                        fb_sql = f"""
                        SELECT {group_str_fb}, {y_agg_expr} AS "{y_col}"
                        FROM {target_src}
                        GROUP BY {group_str_fb}
                        ORDER BY "{y_col}" DESC
                        LIMIT 15
                        """
                        v_df = _execute_safe_query(con, fb_sql)
                        records = df_to_safe_records(v_df)
                        if not records:
                            query_status = "no_data"
                    except Exception as fb_err:
                        query_status = "query_error"
                        query_error_detail = str(fb_err)[:200]
                        logger.warning("Error querying chart '%s': %s", v_title, fb_err)
            elif query_status == "ok":
                query_status = "missing_fields"

            vega_spec = _build_vega_lite_spec(v_title, c_type, x_col, y_col, color_col, records, is_temporal=x_is_temporal)

            hydrated_visuals.append({
                "id": viz.get("id", str(uuid.uuid4())),
                "title": v_title,
                "description": viz.get("description", ""),
                "table": t_name,
                "chart_type": c_type,
                "x_field": x_col,
                "y_field": y_col,
                "color_field": color_col,
                "aggregation": agg,
                "data": records,
                "vega_spec": vega_spec,
                "_query_status": query_status,
                "_query_error": query_error_detail if query_error_detail else None,
            })

        while len(hydrated_visuals) < 6:
            hydrated_visuals.append({
                "id": f"viz_pad_{len(hydrated_visuals)}",
                "title": f"Visualization {len(hydrated_visuals)+1}",
                "description": "Additional analytical perspective",
                "chart_type": "bar",
                "data": [],
                "vega_spec": _build_vega_lite_spec(f"Visualization {len(hydrated_visuals)+1}", "bar", None, None, None, []),
            })

        spec["visualizations"] = hydrated_visuals
        return spec
    finally:
        con.close()


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@intelligence_bp.route("/profile", methods=["POST"])
def profile_data():
    """Profile selected tables in the workspace."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    table_names = data.get("tables", [])
    requested_ws_id = data.get("workspace_id")

    if not table_names:
        raise AppError(ErrorCode.INVALID_REQUEST, "Please select at least one table")

    try:
        workspace = _get_or_create_workspace(identity_id, requested_ws_id)
        profile = _build_full_profile(workspace, table_names)
        return json_ok({"profile": profile})
    except AppError:
        raise
    except Exception as exc:
        logger.error("Error profiling data: %s", exc, exc_info=True)
        raise AppError(ErrorCode.DATA_LOAD_ERROR, f"Failed to profile tables: {exc}") from exc


@intelligence_bp.route("/suggestions", methods=["POST"])
def generate_suggestions():
    """Generate dynamic, intelligent dashboard suggestions based on data profile."""
    data = request.get_json() or {}
    profile = data.get("profile")
    model_config = data.get("model")

    if not profile or not profile.get("tables"):
        raise AppError(ErrorCode.INVALID_REQUEST, "Valid data profile is required")

    client = _get_client_from_request(model_config)
    lang_inst = build_language_instruction(_get_ui_lang(), mode="full")

    summary_tables = []
    for t in profile.get("tables", []):
        summary_tables.append({
            "name": t["table_name"],
            "row_count": t["row_count"],
            "measures": t.get("measures", []),
            "dimensions": t.get("dimensions", []),
            "temporal_columns": t.get("temporal_columns", []),
            "columns": [{"name": c["name"], "type": c["type"], "semantic_type": c["semantic_type"]} for c in t.get("columns", [])],
            "sample_records": t.get("sample_records", [])[:2],
        })

    system_prompt = f"""You are an elite business intelligence and data analyst AI for InsightCanvas.
Your task is to analyze the provided dataset schema and profile, and propose 4 to 5 highly relevant, diverse dashboard concepts tailored specifically to the actual data.

IMPORTANT RULES:
1. NEVER assume a specific business domain (e.g. do NOT force sales/revenue if the data is HR, logs, operations, or movies).
2. Look strictly at the actual measures, dimensions, and date fields present in the schema.
3. Every suggestion must be clearly distinct in analytical focus (e.g., Executive Summary, Trend/Temporal Dynamics, Categorical Breakdown, Performance/KPI Drivers, Anomaly/Distribution).
4. For each suggestion, provide:
   - "id": a unique snake_case identifier (e.g. "exec_summary", "regional_performance")
   - "title": a clear, professional dashboard title (under 5 words)
   - "description": a 1-sentence summary of what this dashboard reveals
   - "prompt": the exact natural-language request prompt to build this dashboard
   - "reason": why this dashboard is valuable given the detected columns/measures

Return ONLY valid JSON matching this schema:
{{
  "suggestions": [
    {{
      "id": "string",
      "title": "string",
      "description": "string",
      "prompt": "string",
      "reason": "string",
      "focus_metrics": ["col1", "col2"]
    }}
  ]
}}
"""
    system_prompt = inject_language_instruction(system_prompt, lang_inst)
    user_query = f"Dataset Profile:\n{json.dumps(summary_tables, ensure_ascii=False, indent=2)}"

    try:
        response = client.get_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            reasoning_effort=reasoning_effort_for("analyst", client.model),
        )
        content = response.choices[0].message.content or ""
        json_objs = extract_json_objects(content)
        if json_objs and "suggestions" in json_objs[0]:
            return json_ok(json_objs[0])
        parsed = json.loads(content)
        return json_ok(parsed if "suggestions" in parsed else {"suggestions": []})
    except Exception as exc:
        logger.error("Error generating suggestions: %s", exc, exc_info=True)
        raise classify_and_wrap_llm_error(exc) from exc


@intelligence_bp.route("/generate-dashboard", methods=["POST"])
def generate_dashboard():
    """Generate structured dashboard specification from user prompt & data profile."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    profile = data.get("profile")
    user_prompt = data.get("prompt", "Create a comprehensive executive dashboard summarizing the key metrics and trends.")
    model_config = data.get("model")

    if not profile or not profile.get("tables"):
        raise AppError(ErrorCode.INVALID_REQUEST, "Valid data profile is required")

    workspace = _get_or_create_workspace(identity_id)
    client = _get_client_from_request(model_config)
    lang_inst = build_language_instruction(_get_ui_lang(), mode="full")

    tables_summary = []
    for t in profile.get("tables", []):
        cols_with_samples = []
        for c in t.get("columns", []):
            col_info: dict[str, Any] = {
                "name": c["name"],
                "type": c["type"],
                "semantic_type": c["semantic_type"],
                "distinct_count": c.get("distinct_count"),
            }
            sample_vals = c.get("sample_values", [])
            if sample_vals:
                col_info["sample_values"] = sample_vals[:3]
            cols_with_samples.append(col_info)
        tables_summary.append({
            "table_name": t["table_name"],
            "row_count": t["row_count"],
            "measures": t.get("measures", []),
            "dimensions": t.get("dimensions", []),
            "temporal_columns": t.get("temporal_columns", []),
            "columns": cols_with_samples,
            "sample_records": t.get("sample_records", [])[:3],
        })

    system_prompt = f"""You are an expert dashboard and analytics architect for InsightCanvas.
Given the dataset profile and the user's analytical goal, synthesize a complete, highly meaningful dashboard specification.

LAYOUT REQUIREMENTS (STRICT):
1. **1 Top-Level Filter**: Select the single most useful categorical or date dimension field across the data (e.g. Region, Department, Category, Year, Status).
2. **Exactly 4 KPI Cards**: Pick the 4 most critical summary metrics. Choose appropriate aggregations (SUM, AVG, COUNT, MIN, MAX) and formatting ('currency', 'number', 'percent', 'integer').
3. **Exactly 6 Visualizations** (3 in Row 1, 3 in Row 2):
   - Choose diverse, complementary chart types from ('bar', 'line', 'area', 'scatter', 'donut', 'pie').
   - Use 'line' or 'area' for temporal/trend fields.
   - Use 'bar' or 'donut' for categorical breakdowns.
   - ALWAYS assign dimension/categorical columns to x_field and numeric/measure columns to y_field.
   - Ensure high analytical value and zero redundancy.

CRITICAL COLUMN RULES:
- ONLY use table names and column names that ACTUALLY EXIST in the provided schema below.
- Do NOT invent, guess, or hallucinate column names. Every x_field, y_field, color_field, and measure_column MUST match an exact column name from the schema.
- Use the 'sample_values' and 'distinct_count' fields to understand data distribution and choose meaningful axes.
- For KPIs: use measure (numeric) columns with SUM/AVG/MAX/MIN aggregation, or use identifier columns with COUNT aggregation.
- For visualizations: x_field should be a dimension/categorical column, y_field should be a numeric/measure column.

AGGREGATION ACCURACY RULES:
- For columns containing rates, percentages, ratios, or averages (e.g. utilization_percentage, defect_rate, efficiency_score): use AVG, never SUM.
- For columns that are counts or quantities (e.g. total_output, units_produced, quantity): use SUM.
- For ID or key columns: use COUNT(DISTINCT).
- For monetary/currency columns (e.g. cost, price, revenue, salary): use SUM for totals, AVG for per-unit metrics.
- Match the 'format' field to the data semantics: use 'percent' for rate/percentage measures, 'currency' for monetary, 'integer' for counts.

Return ONLY valid JSON matching this structure:
{{
  "title": "Dashboard Title",
  "description": "Executive summary of the dashboard insights",
  "filter": {{
    "table": "table_name",
    "field": "column_name",
    "label": "Filter Display Label"
  }},
  "kpis": [
    {{
      "id": "kpi_1",
      "title": "Metric Name",
      "table": "table_name",
      "measure_column": "column_name",
      "aggregation": "SUM|AVG|COUNT|MIN|MAX",
      "format": "currency|number|percent|integer",
      "subtitle": "supporting context",
      "comparison": "optional trend or baseline comparison"
    }}
  ],
  "visualizations": [
    {{
      "id": "viz_1",
      "title": "Chart Title",
      "description": "What this visual shows",
      "table": "table_name",
      "chart_type": "bar|line|area|scatter|donut|pie",
      "x_field": "dimension_column",
      "y_field": "measure_column",
      "color_field": null,
      "aggregation": "SUM|AVG|COUNT|MIN|MAX"
    }}
  ]
}}
"""
    system_prompt = inject_language_instruction(system_prompt, lang_inst)
    user_query = f"User Request: {user_prompt}\n\nDataset Schema:\n{json.dumps(tables_summary, ensure_ascii=False, indent=2)}"

    try:
        response = client.get_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            reasoning_effort=reasoning_effort_for("analyst", client.model),
        )
        content = response.choices[0].message.content or ""
        json_objs = extract_json_objects(content)
        raw_spec = json_objs[0] if json_objs else json.loads(content)

        # Post-LLM validation: fix hallucinated column names
        raw_spec = _validate_and_fix_spec(raw_spec, profile)

        hydrated = _hydrate_dashboard_spec(workspace, raw_spec, filter_value="All")

        # ── Self-Healing Validation Loop ──
        # Check for broken KPIs and visuals, auto-repair them via LLM
        broken_kpis = []
        for i, kpi in enumerate(hydrated.get("kpis", [])):
            if kpi.get("formatted_value") in ("N/A", "—", None, "") or kpi.get("raw_value") is None:
                broken_kpis.append({"index": i, "id": kpi.get("id"), "title": kpi.get("title"),
                                    "measure_column": kpi.get("measure_column"), "table": kpi.get("table"),
                                    "reason": "KPI value is N/A — column may not exist or aggregation failed"})

        broken_visuals = []
        for i, viz in enumerate(hydrated.get("visualizations", [])):
            status = viz.get("_query_status", "ok")
            if status != "ok":
                broken_visuals.append({"index": i, "id": viz.get("id"), "title": viz.get("title"),
                                       "x_field": viz.get("x_field"), "y_field": viz.get("y_field"),
                                       "chart_type": viz.get("chart_type"), "table": viz.get("table"),
                                       "status": status, "error": viz.get("_query_error", "")})

        if broken_kpis or broken_visuals:
            logger.info("Self-healing: %d broken KPIs, %d broken visuals detected. Attempting auto-repair.",
                        len(broken_kpis), len(broken_visuals))
            column_inventory = _build_column_inventory(profile)
            stripped = _strip_spec_for_llm(hydrated)

            repair_prompt = f"""The dashboard you generated has accuracy issues. Some KPIs show N/A values and some visualizations have empty data because of incorrect column references.

BROKEN KPIs (showing N/A):
{json.dumps(broken_kpis, indent=2) if broken_kpis else "None"}

BROKEN VISUALIZATIONS (empty/error):
{json.dumps(broken_visuals, indent=2) if broken_visuals else "None"}

Current Dashboard Spec:
{json.dumps(stripped, indent=2)}

Available Columns (use ONLY these exact names):
{column_inventory}

FIX INSTRUCTIONS:
1. For each broken KPI: replace measure_column with a VALID column name from the Available Columns that is a numeric/measure type. Choose an appropriate aggregation.
2. For each broken visualization: replace x_field and y_field with VALID column names. x_field must be a dimension/categorical column, y_field must be a numeric/measure column.
3. Keep all working KPIs and visualizations UNCHANGED.
4. Return the COMPLETE fixed dashboard spec (all 4 KPIs + 6 visualizations).

Return ONLY valid JSON with the complete fixed dashboard specification (same structure as the original)."""

            try:
                repair_response = client.get_completion(
                    messages=[
                        {"role": "system", "content": "You are a dashboard repair assistant. Fix broken column references using only the available columns provided."},
                        {"role": "user", "content": repair_prompt},
                    ],
                    reasoning_effort=reasoning_effort_for("analyst", client.model),
                )
                repair_content = repair_response.choices[0].message.content or ""
                repair_objs = extract_json_objects(repair_content)
                if repair_objs:
                    repaired_spec = repair_objs[0]
                    repaired_spec = _validate_and_fix_spec(repaired_spec, profile)
                    hydrated = _hydrate_dashboard_spec(workspace, repaired_spec, filter_value="All")
                    logger.info("Self-healing: successfully repaired dashboard spec")
            except Exception as repair_err:
                logger.warning("Self-healing repair failed (using original): %s", repair_err)

        return json_ok({"dashboard": hydrated})
    except Exception as exc:
        logger.error("Error generating dashboard: %s", exc, exc_info=True)
        raise classify_and_wrap_llm_error(exc) from exc


@intelligence_bp.route("/query-filter", methods=["POST"])
def query_filter():
    """Re-query dashboard KPIs and charts with updated filter value instantly via DuckDB."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    dashboard_spec = data.get("dashboard")
    filter_value = data.get("filter_value", "All")

    if not dashboard_spec:
        raise AppError(ErrorCode.INVALID_REQUEST, "Dashboard specification is required")

    workspace = _get_or_create_workspace(identity_id)
    hydrated = _hydrate_dashboard_spec(workspace, dashboard_spec, filter_value=filter_value)
    return json_ok({"dashboard": hydrated})


@intelligence_bp.route("/chat", methods=["POST"])
def chat_refinement():
    """Refine or update the dashboard through conversational instructions."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    current_dashboard = data.get("current_dashboard")
    user_message = data.get("message", "")
    profile = data.get("profile")
    model_config = data.get("model")
    chat_history = data.get("history", [])

    if not current_dashboard:
        raise AppError(ErrorCode.INVALID_REQUEST, "Current dashboard state is required")

    workspace = _get_or_create_workspace(identity_id)
    client = _get_client_from_request(model_config)
    lang_inst = build_language_instruction(_get_ui_lang(), mode="full")

    # Strip noise from dashboard spec — remove hydrated data, vega specs,
    # computed KPI values so the LLM only sees structural definitions
    stripped_dashboard = _strip_spec_for_llm(current_dashboard)
    column_inventory = _build_column_inventory(profile)

    system_prompt = f"""You are the Intelligence Assistant for InsightCanvas.
The user wants to modify or ask a question about their current generated dashboard.

Current Dashboard Specification (structural definition only):
{json.dumps(stripped_dashboard, ensure_ascii=False, indent=2)}

Available Columns (full inventory — use ONLY these exact column names):
{column_inventory}

MODIFICATION RULES (CRITICAL — follow precisely):
1. When the user asks to change a chart, KPI, axis, field, or metric:
   - You MUST actually modify the corresponding fields (x_field, y_field, measure_column, chart_type, aggregation, color_field, title, etc.) in the updated_dashboard.
   - Do NOT return the same specification unchanged when the user asks for a modification.
   - In your reply, state EXACTLY which fields you changed (e.g. "Changed viz_3.x_field from 'Employee_ID' to 'Department'").
   - Always use column names EXACTLY as they appear in the Available Columns inventory above.
2. When the user asks a general analytical question:
   - Answer accurately and keep the dashboard specification unchanged.
3. Always maintain: exactly 4 KPIs, 1 Filter, 6 Visualizations.
4. For axis changes: x_field should typically be a dimension/categorical column; y_field should be a numeric/measure column.

Return ONLY a JSON object:
{{
  "reply": "Assistant message explaining what was changed or answered, including specific field changes",
  "updated_dashboard": <full updated dashboard specification object with ALL fields including filter, kpis, visualizations>
}}
"""
    system_prompt = inject_language_instruction(system_prompt, lang_inst)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history[-10:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    def _call_llm(msgs: list[dict]) -> tuple[str, dict[str, Any]]:
        response = client.get_completion(
            messages=msgs,
            reasoning_effort=reasoning_effort_for("analyst", client.model),
        )
        content = response.choices[0].message.content or ""
        json_objs = extract_json_objects(content)
        parsed = json_objs[0] if json_objs else json.loads(content)
        return parsed.get("reply", "Dashboard updated."), parsed.get("updated_dashboard", current_dashboard)

    try:
        reply_text, updated_spec = _call_llm(messages)

        # Diff detection: if the user asked for a modification but the spec
        # is unchanged, retry once with a stronger nudge
        modification_keywords = ["change", "update", "modify", "replace", "switch", "use", "set", "make",
                                 "show", "display", "add", "remove", "swap", "convert", "move", "put", "want"]
        user_wants_change = any(kw in user_message.lower() for kw in modification_keywords)

        if user_wants_change:
            stripped_updated = _strip_spec_for_llm(updated_spec)
            if json.dumps(stripped_updated, sort_keys=True) == json.dumps(stripped_dashboard, sort_keys=True):
                logger.warning("LLM returned unchanged spec despite modification request. Retrying with stronger nudge.")
                nudge_msg = (
                    f"IMPORTANT: Your previous response did NOT actually change any fields in the dashboard. "
                    f"The user explicitly asked: '{user_message}'. "
                    f"You MUST modify the relevant fields (x_field, y_field, measure_column, chart_type, etc.) "
                    f"in the updated_dashboard JSON. Return the corrected JSON now."
                )
                retry_messages = messages + [
                    {"role": "assistant", "content": json.dumps({"reply": reply_text, "updated_dashboard": stripped_updated})},
                    {"role": "user", "content": nudge_msg},
                ]
                reply_text, updated_spec = _call_llm(retry_messages)

        # Post-LLM validation: fix hallucinated column names
        updated_spec = _validate_and_fix_spec(updated_spec, profile)

        hydrated = _hydrate_dashboard_spec(
            workspace,
            updated_spec,
            filter_value=updated_spec.get("filter", {}).get("selected_value", "All"),
        )
        return json_ok({
            "reply": reply_text,
            "dashboard": hydrated,
        })
    except Exception as exc:
        logger.error("Error in intelligence chat: %s", exc, exc_info=True)
        raise classify_and_wrap_llm_error(exc) from exc


@intelligence_bp.route("/generate-report", methods=["POST"])
def generate_dashboard_report():
    """Generate an in-depth analytical executive report by analyzing dashboard KPIs, filters, and charts."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    dashboard = data.get("dashboard")
    profile = data.get("profile")
    model_config = data.get("model")

    if not dashboard:
        raise AppError(ErrorCode.INVALID_REQUEST, "Dashboard data is required for report generation")

    client = _get_client_from_request(model_config)
    lang_inst = build_language_instruction(_get_ui_lang(), mode="full")

    # Extract clean context from dashboard
    dash_title = dashboard.get("title", "Executive Intelligence Dashboard")
    dash_desc = dashboard.get("description", "")
    filter_info = dashboard.get("filter") or {}
    selected_filter = filter_info.get("selected_value", "All")
    filter_label = filter_info.get("label") or filter_info.get("field", "Dimension")

    # Summarize KPIs
    kpi_summaries = []
    for k in dashboard.get("kpis", []):
        kpi_summaries.append({
            "title": k.get("title"),
            "formatted_value": k.get("formatted_value"),
            "measure": k.get("measure_column"),
            "aggregation": k.get("aggregation"),
            "subtitle": k.get("subtitle"),
            "comparison": k.get("comparison"),
        })

    # Summarize Visualizations with top records
    viz_summaries = []
    for v in dashboard.get("visualizations", []):
        viz_summaries.append({
            "title": v.get("title"),
            "chart_type": v.get("chart_type"),
            "x_field": v.get("x_field"),
            "y_field": v.get("y_field"),
            "color_field": v.get("color_field"),
            "aggregation": v.get("aggregation"),
            "top_data_points": v.get("data", [])[:8],
        })

    analytical_context = {
        "dashboard_title": dash_title,
        "dashboard_description": dash_desc,
        "active_filter": {
            "field": filter_label,
            "selected_value": selected_filter,
        },
        "kpi_metrics": kpi_summaries,
        "visualizations": viz_summaries,
    }

    system_prompt = f"""You are a Principal Executive Business Intelligence Analyst & Strategic Director.
Your task is to analyze the provided analytical dashboard—including all 4 Key Performance Indicators (KPIs), the active slice filter, and the 6 visualization datasets—and generate an in-depth, executive-ready analytical intelligence report in GitHub-flavored Markdown.

REPORT GUIDELINES:
1. **Tone**: Authoritative, strategic, quantitative, and actionable. Written for C-suite executives, Board members, and VP-level stakeholders.
2. **Data Accuracy (STRICT)**: Use ONLY the exact numbers, percentages, KPI values, and categorical breakdowns present in the provided analytical context. Reference exact numbers from the data.
3. **Analytical Rigor**: Do not merely list numbers—explain the 'why', the business root causes, operational mechanisms, cross-metric correlations, and strategic risks/opportunities.
4. **Visual Cross-Referencing**: Specifically refer to each of the 6 charts by their exact titles so readers can cross-reference the visual charts in the report.

STRUCTURE REQUIRED:
# Executive Intelligence Report: {dash_title}

> **Analytical Scope**: Scope Filter: `{filter_label} = {selected_filter}` | Generated on {datetime.now().strftime("%B %d, %Y")}

## 1. Executive Summary & Strategic Overview
- 2-3 high-impact paragraphs summarizing overall organizational performance, health, key strengths, and critical vulnerabilities under the current analytical scope.
- **Top Strategic Highlights**: 3-4 bullet points capturing the most notable successes, high-risk flags, and inflection points.

## 2. KPI Performance Deep-Dive & Root-Cause Attribution
- Detailed breakdown of each of the 4 KPI metrics:
  - **Metric Value & Definition**: Exact value, computation method, and benchmark status.
  - **Performance Drivers**: What operational, market, or resource factors explain this number.
  - **Variance & Baseline Comparison**: Contextualize against historical trends or targets.

## 3. Multi-Dimensional Visual Analytics & Trend Interpretations
- Detailed analytical walkthrough of each of the 6 visualization charts:
  - For each chart, provide:
    - **Observed Distribution / Trajectory**: Key leaders, laggards, seasonal shifts, or concentration ratios.
    - **Analytical Finding**: What this visual reveals about operational bottlenecks, product/segment health, or capacity utilization.
    - **Notable Outliers**: Specific anomalies or exceptional data points that warrant management attention.

## 4. Cross-Metric Correlations & Risk Evaluation
- Cross-synthesize relationships between the KPI summary numbers and the granular dimensional charts (e.g. how specific segments or time periods drive the overall KPI).
- Identify systemic risks: margin compression, capacity constraints, quality degradation, attrition, or revenue concentration.

## 5. Strategic Recommendations & Prioritized Action Roadmap
- Provide 4-5 concrete, high-ROI strategic initiatives.
- For each recommendation, structure as:
  - **Initiative**: Clear, actionable title.
  - **Recommended Action**: Specific operational or strategic steps.
  - **Expected Business Impact**: Measurable improvement in efficiency, cost reduction, or output.
  - **Priority & Timeline**: (High / Medium / Low | Immediate / 30-Day / 90-Day).

Return ONLY the complete Markdown document. Do not wrap in JSON or code fences."""

    system_prompt = inject_language_instruction(system_prompt, lang_inst)
    user_query = f"Dashboard Analytical Data:\n{json.dumps(analytical_context, ensure_ascii=False, indent=2)}"

    try:
        response = client.get_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            reasoning_effort=reasoning_effort_for("analyst", client.model),
        )
        report_md = response.choices[0].message.content or ""
        # Clean potential markdown wrapping if LLM enclosed the whole output in ```markdown
        if report_md.startswith("```markdown"):
            report_md = report_md[len("```markdown"):].strip()
        elif report_md.startswith("```"):
            report_md = report_md[3:].strip()
        if report_md.endswith("```"):
            report_md = report_md[:-3].strip()

        return json_ok({
            "title": f"Report - {dash_title}",
            "report": report_md,
            "created_at": datetime.now().isoformat(),
        })
    except Exception as exc:
        logger.error("Error generating intelligence report: %s", exc, exc_info=True)
        raise classify_and_wrap_llm_error(exc) from exc


# ---------------------------------------------------------------------------
# Session Persistence Routes
# ---------------------------------------------------------------------------

@intelligence_bp.route("/sessions", methods=["GET"])
def list_intelligence_sessions():
    """List all saved Intelligence Hub sessions."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    s_dir = _get_sessions_dir(identity_id)
    sessions = []
    for f in s_dir.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                meta = json.load(fh)
                sessions.append({
                    "id": meta.get("id", f.stem),
                    "title": meta.get("title", "Untitled Dashboard"),
                    "source_id": meta.get("source_id"),
                    "database": meta.get("database"),
                    "tables": meta.get("tables", []),
                    "created_at": meta.get("created_at"),
                    "updated_at": meta.get("updated_at"),
                    "prompt": meta.get("prompt"),
                })
        except Exception as exc:
            logger.debug("Failed to read session file %s: %s", f, exc)

    sessions.sort(key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)
    return json_ok({"sessions": sessions})


@intelligence_bp.route("/sessions/<session_id>", methods=["GET"])
def get_intelligence_session(session_id: str):
    """Retrieve full detail of a saved session."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    s_dir = _get_sessions_dir(identity_id)
    s_path = s_dir / f"{session_id}.json"
    if not s_path.exists():
        raise AppError(ErrorCode.NOT_FOUND, "Session not found")

    with open(s_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    return json_ok({"session": data})


@intelligence_bp.route("/sessions/save", methods=["POST"])
def save_intelligence_session():
    """Save an Intelligence Hub session."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    data = request.get_json() or {}
    session_id = data.get("id") or f"ih_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    payload = {
        "id": session_id,
        "title": data.get("title") or data.get("dashboard", {}).get("title") or "Intelligence Dashboard",
        "source_id": data.get("source_id"),
        "database": data.get("database"),
        "tables": data.get("tables", []),
        "profile": data.get("profile"),
        "dashboard": data.get("dashboard"),
        "prompt": data.get("prompt"),
        "chat_history": data.get("chat_history", []),
        "created_at": data.get("created_at") or datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

    s_dir = _get_sessions_dir(identity_id)
    s_path = s_dir / f"{session_id}.json"
    with open(s_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    return json_ok({"session": payload})


@intelligence_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_intelligence_session(session_id: str):
    """Delete a saved session."""
    identity_id = get_identity_id()
    if not identity_id:
        raise AppError(ErrorCode.AUTH_REQUIRED, "Identity ID required")

    s_dir = _get_sessions_dir(identity_id)
    s_path = s_dir / f"{session_id}.json"
    if s_path.exists():
        s_path.unlink()

    return json_ok({"deleted": True, "id": session_id})
