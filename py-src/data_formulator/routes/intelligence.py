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


def _safe_get_identity_id() -> str:
    """Safely resolve identity ID, falling back to request header or anonymous browser session."""
    try:
        ident = get_identity_id()
        if ident:
            return ident
    except Exception as exc:
        logger.debug("Standard get_identity_id failed (%s); trying fallback headers", exc)

    # Fallback 1: Extract from X-Identity-Id header if present
    client_identity = request.headers.get("X-Identity-Id")
    if client_identity:
        val = client_identity.split(":", 1)[1] if ":" in client_identity else client_identity
        return f"browser:{val}"

    # Fallback 2: Local anonymous fallback
    return "local:anonymous"


def _get_client_from_request(model_config: dict[str, Any] | None) -> Any:
    """Resolve LiteLLM client from request model config."""
    from data_formulator.routes.agents import get_client
    if not model_config:
        global_models = list(model_registry._models.values())
        if global_models:
            return get_client(global_models[0], trusted=True)
        raise AppError(
            ErrorCode.INVALID_REQUEST,
            "Model configuration is required. Please configure or select an AI model in Settings."
        )
    return get_client(model_config)


def _get_sessions_dir(identity_id: str) -> Path:
    """Directory for persisting Intelligence Hub dashboard sessions."""
    home = get_user_home(identity_id)
    s_dir = home / "intelligence_sessions"
    s_dir.mkdir(parents=True, exist_ok=True)
    return s_dir


def _locate_session_file(session_id: str, identity_id: str) -> Path:
    """Locate session file across current user dir, fallback identities, and all user dirs."""
    from data_formulator.datalake.workspace import get_data_formulator_home
    s_dir = _get_sessions_dir(identity_id)
    s_path = s_dir / f"{session_id}.json"
    if s_path.exists():
        return s_path

    # Check client identity header if different
    client_identity = request.headers.get("X-Identity-Id")
    if client_identity:
        val = client_identity.split(":", 1)[-1]
        for candidate_id in [f"browser:{val}", f"user:{val}", val]:
            try:
                candidate_dir = _get_sessions_dir(candidate_id)
                candidate_path = candidate_dir / f"{session_id}.json"
                if candidate_path.exists():
                    return candidate_path
            except Exception:
                pass

    # Check anonymous / browser dirs
    anon_dir = _get_sessions_dir("local:anonymous")
    anon_path = anon_dir / f"{session_id}.json"
    if anon_path.exists():
        return anon_path

    # Search all user dirs under users/
    try:
        users_root = get_data_formulator_home() / "users"
        if users_root.exists():
            for user_dir in users_root.iterdir():
                if user_dir.is_dir():
                    candidate_file = user_dir / "intelligence_sessions" / f"{session_id}.json"
                    if candidate_file.exists():
                        return candidate_file
    except Exception as exc:
        logger.debug("Error searching users_root for session %s: %s", session_id, exc)

    return s_path


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

def _profile_table(workspace: Workspace, table_name: str, identity_id: str | None = None) -> dict[str, Any]:
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

    # Cross-workspace recovery: if not in active workspace, search other workspaces of this user
    if not resolved_name and identity_id:
        try:
            mgr = get_workspace_manager(identity_id)
            for other_ws_id in mgr.list_workspaces():
                if other_ws_id != workspace.id:
                    other_ws = mgr.open_workspace(other_ws_id, identity_id)
                    for t in other_ws.list_tables():
                        if t == table_name or t.lower() == table_name.lower():
                            df = other_ws.read_data_as_df(t)
                            workspace.save_table(table_name, df)
                            resolved_name = table_name
                            logger.info("Recovered table '%s' from workspace '%s'", table_name, other_ws_id)
                            break
                    if resolved_name:
                        break
        except Exception as search_err:
            logger.warning("Error searching other workspaces for table '%s': %s", table_name, search_err)

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

        sample_vals = [make_json_safe(v) for v in distinct_vals[:8]]

        # ── P0 Accuracy: Compute distribution statistics for richer LLM context ──
        col_stats: dict[str, Any] = {}
        if is_measure and len(series.dropna()) > 0:
            numeric_series = pd.to_numeric(series, errors='coerce').dropna()
            if len(numeric_series) > 0:
                col_stats = {
                    "min": make_json_safe(round(float(numeric_series.min()), 4)),
                    "max": make_json_safe(round(float(numeric_series.max()), 4)),
                    "mean": make_json_safe(round(float(numeric_series.mean()), 2)),
                    "median": make_json_safe(round(float(numeric_series.median()), 2)),
                    "stddev": make_json_safe(round(float(numeric_series.std()), 2)),
                }
        elif is_temporal and len(series.dropna()) > 0:
            try:
                temporal_series = pd.to_datetime(series, errors='coerce').dropna()
                if len(temporal_series) > 0:
                    col_stats = {
                        "min_date": str(temporal_series.min().date()),
                        "max_date": str(temporal_series.max().date()),
                        "date_range_days": int((temporal_series.max() - temporal_series.min()).days),
                    }
            except Exception:
                pass
        elif is_dimension and distinct_count <= 50 and len(series.dropna()) > 0:
            try:
                value_counts = series.dropna().astype(str).value_counts().head(8)
                total_non_null = len(series.dropna())
                col_stats = {
                    "top_values": {
                        str(k): {"count": int(v), "pct": round(v / total_non_null * 100, 1)}
                        for k, v in value_counts.items()
                    }
                }
            except Exception:
                pass

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
            "statistics": col_stats,
        })

    sample_records = df_to_safe_records(sample_df.head(15))

    return {
        "table_name": table_name,
        "row_count": total_rows,
        "columns": columns_profile,
        "measures": measures,
        "dimensions": dimensions,
        "temporal_columns": temporal_columns,
        "sample_records": sample_records,
    }


def _validate_relationship_overlap(
    workspace: Workspace,
    t1_name: str,
    c1_name: str,
    t2_name: str,
    c2_name: str,
) -> dict[str, Any]:
    """Validate relationship between two tables by checking value overlap percentage and cardinality in DuckDB."""
    try:
        p1 = str(workspace.get_parquet_path(t1_name)).replace("\\", "/")
        p2 = str(workspace.get_parquet_path(t2_name)).replace("\\", "/")
        con = duckdb.connect(":memory:")
        try:
            q_stats = f"""
            SELECT
                (SELECT COUNT(DISTINCT "{c1_name}") FROM read_parquet('{p1}') WHERE "{c1_name}" IS NOT NULL) AS d1,
                (SELECT COUNT("{c1_name}") FROM read_parquet('{p1}') WHERE "{c1_name}" IS NOT NULL) AS cnt1,
                (SELECT COUNT(DISTINCT "{c2_name}") FROM read_parquet('{p2}') WHERE "{c2_name}" IS NOT NULL) AS d2,
                (SELECT COUNT("{c2_name}") FROM read_parquet('{p2}') WHERE "{c2_name}" IS NOT NULL) AS cnt2,
                (SELECT COUNT(DISTINCT t1."{c1_name}") FROM read_parquet('{p1}') t1 INNER JOIN read_parquet('{p2}') t2 ON t1."{c1_name}" = t2."{c2_name}" WHERE t1."{c1_name}" IS NOT NULL) AS overlap_cnt
            """
            row = con.execute(q_stats).fetchone()
            if not row:
                return {"confidence": "medium", "overlap_percentage": None, "cardinality": "unknown"}
            d1, cnt1, d2, cnt2, overlap = row[0] or 0, row[1] or 0, row[2] or 0, row[3] or 0, row[4] or 0

            min_d = min(d1, d2) if min(d1, d2) > 0 else 1
            overlap_pct = round((overlap / min_d) * 100, 1)

            u1 = (d1 == cnt1) and cnt1 > 0
            u2 = (d2 == cnt2) and cnt2 > 0
            if u1 and u2:
                cardinality = "1:1"
            elif u1 and not u2:
                cardinality = "1:N"
            elif not u1 and u2:
                cardinality = "N:1"
            else:
                cardinality = "N:M"

            confidence = "high" if overlap_pct >= 70 else ("medium" if overlap_pct >= 30 else "low")
            return {
                "confidence": confidence,
                "overlap_percentage": overlap_pct,
                "cardinality": cardinality,
                "t1_unique": u1,
                "t2_unique": u2,
            }
        finally:
            con.close()
    except Exception as exc:
        logger.debug("Relationship overlap validation fallback: %s", exc)
        return {"confidence": "high", "overlap_percentage": None, "cardinality": "unknown"}


def _build_full_profile(workspace: Workspace, table_names: list[str], identity_id: str | None = None) -> dict[str, Any]:
    """Generate comprehensive dataset profile across all selected tables."""
    tables_profile = []
    for t_name in table_names:
        try:
            p = _profile_table(workspace, t_name, identity_id)
            tables_profile.append(p)
        except Exception as exc:
            logger.warning("Failed to profile table '%s': %s", t_name, exc)

    if not tables_profile:
        raise AppError(ErrorCode.DATA_LOAD_ERROR, f"None of the selected tables ({', '.join(table_names)}) could be profiled")

    # Inferred relationships with value overlap & cardinality validation
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
                    col1_actual = cols1[c_low]
                    col2_actual = cols2[c_low]
                    rel_meta = _validate_relationship_overlap(
                        workspace, t1["table_name"], col1_actual, t2["table_name"], col2_actual
                    )
                    relationships.append({
                        "table1": t1["table_name"],
                        "column1": col1_actual,
                        "table2": t2["table_name"],
                        "column2": col2_actual,
                        "confidence": rel_meta.get("confidence", "high"),
                        "cardinality": rel_meta.get("cardinality", "unknown"),
                        "overlap_percentage": rel_meta.get("overlap_percentage"),
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
        kpi_obj = {
            "id": kpi.get("id"),
            "title": kpi.get("title"),
            "table": kpi.get("table"),
            "measure_column": kpi.get("measure_column"),
            "aggregation": kpi.get("aggregation"),
            "format": kpi.get("format"),
            "subtitle": kpi.get("subtitle"),
            "comparison": kpi.get("comparison"),
        }
        if kpi.get("expression"):
            kpi_obj["expression"] = kpi.get("expression")
        if kpi.get("formula"):
            kpi_obj["formula"] = kpi.get("formula")
        stripped["kpis"].append(kpi_obj)
    stripped["visualizations"] = []
    for viz in spec.get("visualizations", []):
        viz_obj = {
            "id": viz.get("id"),
            "title": viz.get("title"),
            "description": viz.get("description"),
            "table": viz.get("table"),
            "chart_type": viz.get("chart_type"),
            "x_field": viz.get("x_field"),
            "y_field": viz.get("y_field"),
            "color_field": viz.get("color_field"),
            "aggregation": viz.get("aggregation"),
        }
        if viz.get("expression"):
            viz_obj["expression"] = viz.get("expression")
        if viz.get("formula"):
            viz_obj["formula"] = viz.get("formula")
        stripped["visualizations"].append(viz_obj)
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
            sample = ", ".join(str(v) for v in c.get("sample_values", [])[:5])
            distinct = c.get("distinct_count", "?")
            null_pct = c.get("null_percentage", 0)
            stats = c.get("statistics", {})
            stat_str = ""
            if stats.get("min") is not None:
                stat_str = f"  range=[{stats['min']}..{stats['max']}] mean={stats.get('mean','?')} median={stats.get('median','?')} stddev={stats.get('stddev','?')}"
            elif stats.get("min_date"):
                stat_str = f"  date_range=[{stats['min_date']}..{stats['max_date']}] span={stats.get('date_range_days','?')}d"
            elif stats.get("top_values"):
                top = list(stats["top_values"].items())[:4]
                top_str = ", ".join(f"{k}={v.get('pct',0)}%" for k, v in top)
                stat_str = f"  distribution=[{top_str}]"
            null_str = f"  nulls={null_pct}%" if null_pct > 5 else ""
            lines.append(f"    - {c['name']}  type={c.get('type','?')}  semantic={c.get('semantic_type','?')}  distinct={distinct}{null_str}{stat_str}  samples=[{sample}]")
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
# Cross-Domain Mismatch & Guard Engine
# ---------------------------------------------------------------------------

DOMAIN_SIGNATURES: dict[str, dict[str, Any]] = {
    "Healthcare / Medical": {
        "keywords": [
            "patient", "patients", "doctor", "doctors", "hospital", "hospitals", "clinic", "clinics",
            "medicine", "medicines", "medication", "medications", "diagnosis", "diagnoses", "healthcare",
            "clinical", "treatment", "treatments", "prescription", "prescriptions", "symptom", "symptoms",
            "physician", "physicians", "nurse", "nurses", "icu", "triage", "pathology", "radiology",
            "oncology", "cardiology", "pediatric", "pediatrics", "vital signs", "blood pressure",
            "disease", "diseases", "admissions", "admission", "discharge", "discharges", "ehr", "emr",
        ],
        "indicators": [
            "patient", "doctor", "hospital", "clinic", "medic", "health", "diagnos", "treatment",
            "prescrib", "prescript", "clinic", "admit", "admission", "discharge", "symptom",
            "nurse", "physician", "disease", "vital", "triage", "ehr", "emr", "drug", "dose",
        ],
    },
    "Real Estate / Property": {
        "keywords": [
            "real estate", "realtor", "realtors", "property listing", "property listings", "tenant", "tenants",
            "lease", "leases", "mortgage", "mortgages", "square footage", "sqft", "bedroom", "bedrooms",
            "bathroom", "bathrooms", "zoning",
        ],
        "indicators": [
            "property", "tenant", "lease", "mortgage", "sqft", "bedroom", "bathroom", "realtor", "listing", "zoning",
        ],
    },
    "Crypto / Web3": {
        "keywords": [
            "crypto", "cryptocurrency", "bitcoin", "btc", "ethereum", "eth", "blockchain", "smart contract",
            "tokenomics", "nft", "nfts", "altcoin", "mining hash", "wallet address",
        ],
        "indicators": [
            "crypto", "bitcoin", "btc", "ethereum", "eth", "token", "blockchain", "nft", "wallet", "hash",
        ],
    },
    "Aviation / Flights": {
        "keywords": [
            "flight", "flights", "airline", "airlines", "airport", "airports", "cockpit", "aircraft",
            "tail number", "boarding gate", "runway",
        ],
        "indicators": [
            "flight", "airline", "airport", "aircraft", "boarding", "runway", "tail_number",
        ],
    },
    "Automotive / Vehicles": {
        "keywords": [
            "vehicle", "vehicles", "vin", "odometer", "mileage", "dealership", "dealerships", "car model",
            "engine transmission",
        ],
        "indicators": [
            "vehicle", "vin", "odometer", "mileage", "dealership", "car", "automobile",
        ],
    },
    "Education / Academic": {
        "keywords": [
            "student", "students", "teacher", "teachers", "professor", "professors", "course enrollment",
            "grade point average", "gpa", "exam score", "exam scores", "tuition", "syllabus", "semester",
            "graduation rate",
        ],
        "indicators": [
            "student", "teacher", "professor", "course", "grade", "gpa", "tuition", "exam", "school", "curriculum", "academic", "semester",
        ],
    },
    "Human Resources / HR": {
        "keywords": [
            "employee", "employees", "payroll", "salary", "salaries", "attrition", "headcount", "hiring date",
            "performance review",
        ],
        "indicators": [
            "employee", "payroll", "salary", "attrition", "headcount", "hire", "hr", "staff", "compensation",
        ],
    },
    "Sales / E-Commerce": {
        "keywords": [
            "sales", "order", "orders", "e-commerce", "ecommerce", "shopping cart", "discount",
            "customer churn",
        ],
        "indicators": [
            "sale", "sales", "order", "revenue", "customer", "product", "discount", "profit", "cart",
        ],
    },
}


def _detect_domain_mismatch(user_prompt: str, profile: dict[str, Any] | None) -> str | None:
    """Detect if the user's prompt requests a domain/topic completely absent from the dataset."""
    if not user_prompt or not profile or not profile.get("tables"):
        return None

    user_prompt_lower = user_prompt.lower()

    # Collect all table names, column names, semantic types, and sample values into a unified corpus
    schema_tokens: set[str] = set()
    table_names: list[str] = []
    for t in profile.get("tables", []):
        t_name = t.get("table_name", "").lower()
        table_names.append(t.get("table_name", ""))
        for part in re.split(r"[_\-\s]+", t_name):
            if part:
                schema_tokens.add(part)
        for c in t.get("columns", []):
            c_name = c.get("name", "").lower()
            for part in re.split(r"[_\-\s]+", c_name):
                if part:
                    schema_tokens.add(part)
            for s in c.get("sample_values", [])[:5]:
                s_str = str(s).lower()
                for part in re.split(r"[_\-\s]+", s_str):
                    if len(part) >= 3:
                        schema_tokens.add(part)

    schema_text = " ".join(schema_tokens)

    for domain_name, domain_def in DOMAIN_SIGNATURES.items():
        matched_kw: list[str] = []
        for kw in domain_def["keywords"]:
            if re.search(rf"\b{re.escape(kw)}\b", user_prompt_lower):
                matched_kw.append(kw)

        if not matched_kw:
            continue

        # Check if the active schema has ANY indicators of this domain
        has_domain_in_schema = False
        for ind in domain_def["indicators"]:
            if ind in schema_text or any(re.search(rf"\b{re.escape(ind)}", tok) for tok in schema_tokens):
                has_domain_in_schema = True
                break

        if not has_domain_in_schema:
            tables_str = ", ".join(table_names) if table_names else "the current"
            requested_concept = matched_kw[0]
            return (
                f"The selected dataset contains '{tables_str}' data, which does not contain data about '{requested_concept}'. "
                f"Please select or connect a {domain_name.lower()} dataset, or request insights based on the available tables."
            )

    return None

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
                # ── RELATIONAL JOIN PROTECTION: Guard against row explosion and metric distortion ──
                is_unique = False
                try:
                    uniq_check = con.execute(f'SELECT COUNT("{dc}") = COUNT(DISTINCT "{dc}") FROM "{dim_table}" WHERE "{dc}" IS NOT NULL').fetchone()
                    is_unique = bool(uniq_check[0]) if uniq_check else False
                except Exception:
                    is_unique = False

                if is_unique:
                    join_clauses.append(f'LEFT JOIN "{dim_table}" ON "{fact_table}"."{fc}" = "{dim_table}"."{dc}"')
                else:
                    # Deduplicate dimension table by join key so each fact row matches at most once
                    logger.info("Join Protection: '%s'.'%s' has duplicates. Using deduplication subquery to preserve fact table row cardinality.", dim_table, dc)
                    dedup_table = f'(SELECT * EXCLUDE (_rn) FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY "{dc}") AS _rn FROM "{dim_table}") WHERE _rn = 1)'
                    join_clauses.append(f'LEFT JOIN {dedup_table} AS "{dim_table}" ON "{fact_table}"."{fc}" = "{dim_table}"."{dc}"')

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


def _parse_and_build_metric_sql(
    agg: str = "SUM",
    measure_column: str | None = None,
    expression: str | None = None,
    all_known_cols: set[str] | None = None,
) -> tuple[str, list[str]]:
    """Build safe DuckDB SQL aggregation expression supporting both standard columns and calculated/derived formulas.

    Returns:
        (sql_expression, list_of_referenced_columns)
    """
    clean_agg = (agg or "SUM").upper().strip()
    target = (expression or measure_column or "").strip()
    if not target:
        return ("COUNT(*)", [])

    known_cols = all_known_cols or set()

    # 1. If explicit SQL aggregate formula is provided (e.g. "SUM(revenue) - SUM(cost)" or "COUNT(DISTINCT x) / COUNT(*)")
    if any(fn in target.upper() for fn in ("SUM(", "AVG(", "COUNT(", "MIN(", "MAX(", "MEDIAN(")):
        ref_cols = [c for c in known_cols if re.search(rf'\b{re.escape(c)}\b', target, re.IGNORECASE)]
        safe_sql = target
        # Protect division by zero: replace `/ <expr>` with `/ NULLIF(<expr>, 0)` if not already protected
        parts = re.split(r'(\s*/\s*)', safe_sql)
        if len(parts) > 1:
            rebuilt = [parts[0]]
            for i in range(1, len(parts), 2):
                slash = parts[i]
                denom = parts[i + 1] if i + 1 < len(parts) else "1"
                if "NULLIF" not in denom.upper():
                    denom = f"NULLIF({denom}, 0)"
                rebuilt.append(slash + denom)
            safe_sql = "".join(rebuilt)
        return (safe_sql, ref_cols)

    # 2. If target is an arithmetic expression with operators +, -, *, / (e.g. "revenue - cost" or "sales / units")
    if any(op in target for op in ("+", "-", "*", "/")):
        ref_cols = [c for c in known_cols if re.search(rf'\b{re.escape(c)}\b', target, re.IGNORECASE)]
        if not ref_cols:
            ref_cols = [
                w for w in re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', target)
                if w.upper() not in ("AND", "OR", "NOT", "AS", "DOUBLE", "CAST", "TRY_CAST", "COALESCE", "NULLIF")
            ]

        expr_sql = target
        # Replace each column identifier with COALESCE(TRY_CAST("col" AS DOUBLE), 0)
        for col in sorted(ref_cols, key=len, reverse=True):
            pattern = rf'\b{re.escape(col)}\b'
            expr_sql = re.sub(pattern, f'COALESCE(TRY_CAST("{col}" AS DOUBLE), 0)', expr_sql)

        # Protect division by zero
        if "/" in expr_sql:
            parts = re.split(r'(\s*/\s*)', expr_sql)
            if len(parts) > 1:
                rebuilt = [parts[0]]
                for i in range(1, len(parts), 2):
                    slash = parts[i]
                    denom = parts[i + 1] if i + 1 < len(parts) else "1"
                    if "NULLIF" not in denom.upper():
                        denom = f"NULLIF({denom}, 0)"
                    rebuilt.append(slash + denom)
                expr_sql = "".join(rebuilt)

        if clean_agg in ("AVG", "AVERAGE", "MEAN"):
            return (f"AVG({expr_sql})", ref_cols)
        elif clean_agg in ("MIN", "MINIMUM"):
            return (f"MIN({expr_sql})", ref_cols)
        elif clean_agg in ("MAX", "MAXIMUM"):
            return (f"MAX({expr_sql})", ref_cols)
        elif clean_agg in ("COUNT",):
            return (f"COUNT({expr_sql})", ref_cols)
        else:
            return (f"SUM({expr_sql})", ref_cols)

    # 3. Standard single column
    col = target
    ref_cols = [col]
    if "DISTINCT" in clean_agg or "UNIQUE" in clean_agg or (
        clean_agg == "COUNT" and (col.lower().endswith("_id") or col.lower() == "id" or col.lower().endswith("_key"))
    ):
        return (f'COUNT(DISTINCT "{col}")', ref_cols)
    elif clean_agg == "COUNT":
        return (f'COUNT("{col}")', ref_cols)
    elif clean_agg in ("AVG", "AVERAGE", "MEAN"):
        return (f'AVG(TRY_CAST("{col}" AS DOUBLE))', ref_cols)
    elif clean_agg in ("MIN", "MINIMUM"):
        return (f'MIN(TRY_CAST("{col}" AS DOUBLE))', ref_cols)
    elif clean_agg in ("MAX", "MAXIMUM"):
        return (f'MAX(TRY_CAST("{col}" AS DOUBLE))', ref_cols)
    else:
        return (f'SUM(TRY_CAST("{col}" AS DOUBLE))', ref_cols)


def _format_metric_value(val: Any, format_type: str = "number", measure_name: str = "", title: str = "") -> tuple[str, float | int | None]:
    """Format raw KPI scalar values for presentation with appropriate domain units (kWh, kW, $, %, hrs, etc.)."""
    if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return "N/A", None

    try:
        num = float(val)
    except (ValueError, TypeError):
        return str(val), None

    combined_text = f"{measure_name} {title}".lower()

    # 1. Currency
    if format_type == "currency" or re.search(r'\b(salary|salaries|revenue|cost|costs|price|prices|budget|profit|expense|expenses|spend|spending|wage|wages|pay|payment|payments|income|sales)\b', combined_text):
        if abs(num) >= 1_000_000_000:
            return f"${num / 1_000_000_000:.2f}B", num
        if abs(num) >= 1_000_000:
            return f"${num / 1_000_000:.2f}M", num
        if abs(num) >= 1_000:
            return f"${num / 1_000:.1f}K", num
        return f"${num:,.2f}", num

    # 2. Percentage
    if format_type == "percent" or re.search(r'\b(rate|percent|percentage|pct|ratio|share|margin|proportion|efficiency|utilization|turnover)\b', combined_text):
        return f"{num:.1f}%", num

    # 3. Energy Consumption (kWh, MWh, GWh)
    if re.search(r'\b(kwh|mwh|gwh|energy_consumption|total_energy|consumption_kwh|power_consumption|electricity_consumption)\b', combined_text) or ("energy" in combined_text and "cost" not in combined_text):
        if abs(num) >= 1_000_000_000:
            return f"{num / 1_000_000_000:.2f}B kWh", num
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M kWh", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K kWh", num
        if num == int(num):
            return f"{int(num):,} kWh", int(num)
        return f"{num:,.1f} kWh", num

    # 4. Power & Peak Demand (kW, MW)
    if re.search(r'\b(kw|mw|peak_demand|demand_kw|power_kw|peak_kw)\b', combined_text):
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M kW", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K kW", num
        if num == int(num):
            return f"{int(num):,} kW", int(num)
        return f"{num:,.1f} kW", num

    # 5. Time Units (Must use strict word boundary so 'minimum' is NOT matched as 'min')
    if re.search(r'\b(minutes?|duration_min|duration_minutes?|wait_time|response_time|travel_time)\b', combined_text):
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.1f}M mins", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K mins", num
        if num == int(num):
            return f"{int(num):,} mins", int(num)
        return f"{num:.1f} mins", num

    if re.search(r'\b(hours?|overtime|hours_worked|duration_hours?|working_hours?)\b', combined_text) and not re.search(r'\b(headcount|human_resources)\b', combined_text):
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.1f}M hrs", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K hrs", num
        if num == int(num):
            return f"{int(num):,} hrs", int(num)
        return f"{num:.1f} hrs", num

    # 6. Carbon / Emissions
    if re.search(r'\b(carbon|emission|emissions|co2|ghg)\b', combined_text):
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M tCO₂", num
        if abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K tCO₂", num
        return f"{num:,.1f} tCO₂", num

    # 7. Integer counts / quantity (e.g. beds, employees, departments, units)
    if format_type == "integer" or re.search(r'\b(beds?|count|counts|number|quantity|units?|items?|departments?|employees?|patients?|users?|customers?|orders?|headcount|visits?)\b', combined_text):
        if abs(num) >= 1_000_000_000:
            return f"{num / 1_000_000_000:.2f}B", num
        if abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M", num
        if abs(num) >= 10_000:
            return f"{num / 1_000:.1f}K", num
        return f"{int(round(num)):,}", int(round(num))

    # Standard numbers
    if abs(num) >= 1_000_000_000:
        return f"{num / 1_000_000_000:.2f}B", num
    if abs(num) >= 1_000_000:
        return f"{num / 1_000_000:.2f}M", num
    if abs(num) >= 1_000:
        return f"{num / 1_000:.1f}K", num
    if num == int(num):
        return f"{int(num):,}", int(num)
    return f"{num:.2f}", num


THEME_PALETTES: dict[str, dict[str, Any]] = {
    "techknomatic": {
        "primary": "#1B75BB",
        "palette": ["#1B75BB", "#00B4D8", "#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#06B6D4"],
    },
    "emerald": {
        "primary": "#10B981",
        "palette": ["#10B981", "#059669", "#34D399", "#6EE7B7", "#047857", "#14B8A6", "#0D9488", "#2DD4BF"],
    },
    "violet": {
        "primary": "#7C3AED",
        "palette": ["#7C3AED", "#6366F1", "#8B5CF6", "#A78BFA", "#4F46E5", "#C084FC", "#9333EA", "#D8B4FE"],
    },
    "sunset": {
        "primary": "#F43F5E",
        "palette": ["#F43F5E", "#FB7185", "#E11D48", "#FB923C", "#F59E0B", "#FDA4AF", "#BE123C", "#F97316"],
    },
    "amber": {
        "primary": "#F59E0B",
        "palette": ["#F59E0B", "#D97706", "#FBBF24", "#FCD34D", "#B45309", "#FB923C", "#EA580C", "#FEF08A"],
    },
    "ocean": {
        "primary": "#06B6D4",
        "palette": ["#06B6D4", "#0891B2", "#22D3EE", "#67E8F9", "#0E7490", "#38BDF8", "#0284C7", "#A5F3FC"],
    },
    "slate": {
        "primary": "#475569",
        "palette": ["#475569", "#334155", "#64748b", "#94a3b8", "#1e293b", "#0f172a", "#cbd5e1", "#6b7280"],
    },
    "vibrant": {
        "primary": "#EC4899",
        "palette": ["#EC4899", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#6366F1"],
    },
}


def _build_vega_lite_spec(
    chart_title: str,
    chart_type: str,
    x_field: str | None,
    y_field: str | None,
    color_field: str | None,
    data_records: list[dict[str, Any]],
    is_temporal: bool = False,
    theme_id: str | None = None,
) -> dict[str, Any]:
    """Assemble a modern, visually stunning Vega-Lite specification."""
    c_type = (chart_type or "bar").lower()

    theme_cfg = THEME_PALETTES.get(theme_id or "techknomatic", THEME_PALETTES["techknomatic"])
    primary_color = theme_cfg["primary"]
    color_range = theme_cfg["palette"]

    mark: Any = "bar"
    if c_type in ("bar", "column"):
        mark = {
            "type": "bar",
            "cornerRadiusEnd": 6,
            "color": primary_color,
        }
    elif c_type == "line":
        mark = {
            "type": "line",
            "interpolate": "monotone",
            "strokeWidth": 2.5,
            "color": primary_color,
            "point": {"filled": True, "size": 36, "fill": primary_color},
        }
    elif c_type == "area":
        mark = {
            "type": "area",
            "interpolate": "monotone",
            "opacity": 0.28,
            "color": primary_color,
            "line": {"color": primary_color, "width": 2.5},
        }
    elif c_type in ("scatter", "point"):
        mark = {
            "type": "point",
            "size": 60,
            "filled": True,
            "opacity": 0.8,
            "color": primary_color,
        }
    elif c_type in ("donut", "pie"):
        mark = {
            "type": "arc",
            "innerRadius": 50 if c_type == "donut" else 0,
            "padAngle": 0.03,
            "cornerRadius": 4,
        }

    tooltip = []
    if x_field:
        x_tooltip_type = "temporal" if is_temporal else "nominal"
        tooltip.append({"field": x_field, "type": x_tooltip_type, "title": str(x_field).replace("_", " ").title()})
    if y_field:
        y_title = str(y_field).replace("_", " ").title()
        y_lower = str(y_field).lower()
        if re.search(r'\b(rate|percent|percentage|pct|ratio|share|margin|efficiency|utilization)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": y_title, "format": ".1%"})
        elif re.search(r'\b(kwh|mwh|gwh|energy_consumption|total_energy|consumption_kwh)\b', y_lower) or ("energy" in y_lower and "cost" not in y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} (kWh)", "format": ",.0f"})
        elif re.search(r'\b(kw|mw|peak_demand|demand|power_kw)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} (kW)", "format": ",.0f"})
        elif re.search(r'\b(cost|price|revenue|salary|wage|budget|spend|sales|income)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} ($)", "format": "$,.2f"})
        elif re.search(r'\b(minutes?|duration_min|duration_minutes|wait_time|response_time|travel_time)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} (mins)", "format": ",.0f"})
        elif re.search(r'\b(hours?|overtime|hours_worked|duration_hours?|working_hours?)\b', y_lower) and not re.search(r'\b(headcount|human_resources)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} (hrs)", "format": ",.1f"})
        elif re.search(r'\b(carbon|emission|emissions|co2|ghg)\b', y_lower):
            tooltip.append({"field": y_field, "type": "quantitative", "title": f"{y_title} (tCO₂)", "format": ",.1f"})
        else:
            tooltip.append({"field": y_field, "type": "quantitative", "title": y_title, "format": "~s"})
    if color_field and color_field not in (x_field, y_field):
        tooltip.append({"field": color_field, "type": "nominal", "title": str(color_field).replace("_", " ").title()})

    # For pie and donut charts: Render layered spec with arc slice and compact, readable value labels (k, M, B)
    if c_type in ("pie", "donut"):
        y_lower = str(y_field or "").lower()
        max_val = 0
        if data_records and isinstance(data_records, list):
            y_nums = [r.get(y_field) for r in data_records if isinstance(r.get(y_field), (int, float))]
            if y_nums:
                max_val = max(abs(v) for v in y_nums)

        if re.search(r'\b(rate|percent|percentage|pct|ratio|share|margin|efficiency|utilization)\b', y_lower):
            text_format = ".1%"
        elif re.search(r'\b(cost|price|revenue|salary|wage|budget|spend|sales|income)\b', y_lower):
            text_format = "$~s" if max_val >= 1000 else "$,.0f"
        elif re.search(r'\b(kwh|mwh|gwh|energy_consumption|total_energy|consumption_kwh)\b', y_lower) or ("energy" in y_lower and "cost" not in y_lower):
            text_format = "~s" if max_val >= 1000 else ",.0f"
        elif re.search(r'\b(kw|mw|peak_demand|demand|power_kw)\b', y_lower):
            text_format = "~s" if max_val >= 1000 else ",.0f"
        elif re.search(r'\b(minutes?|duration_min|duration_minutes|wait_time|response_time|travel_time)\b', y_lower):
            text_format = "~s" if max_val >= 1000 else ",.0f"
        elif re.search(r'\b(hours?|overtime|hours_worked|duration_hours?|working_hours?)\b', y_lower) and not re.search(r'\b(headcount|human_resources)\b', y_lower):
            text_format = "~s" if max_val >= 1000 else ",.1f"
        elif re.search(r'\b(carbon|emission|emissions|co2|ghg)\b', y_lower):
            text_format = "~s" if max_val >= 1000 else ",.1f"
        else:
            text_format = "~s" if max_val >= 1000 else ",.0f"

        arc_layer: dict[str, Any] = {
            "mark": {
                "type": "arc",
                "innerRadius": 45 if c_type == "donut" else 0,
                "outerRadius": 80,
                "padAngle": 0.03,
                "cornerRadius": 4,
            },
            "encoding": {
                "theta": {"field": y_field, "type": "quantitative", "stack": True} if y_field else None,
                "color": {
                    "field": x_field,
                    "type": "nominal",
                    "scale": {"range": color_range},
                    "legend": {"orient": "bottom", "columns": 3, "labelFontSize": 11, "title": None},
                } if x_field else None,
                "tooltip": tooltip if tooltip else None,
            },
        }
        arc_layer["encoding"] = {k: v for k, v in arc_layer["encoding"].items() if v is not None}

        text_layer: dict[str, Any] = {
            "mark": {
                "type": "text",
                "radius": 63 if c_type == "donut" else 52,
                "fontSize": 11,
                "fontWeight": 700,
                "fill": "#ffffff",
            },
            "encoding": {
                "theta": {"field": y_field, "type": "quantitative", "stack": True} if y_field else None,
                "detail": {"field": x_field, "type": "nominal"} if x_field else None,
                "text": {"field": y_field, "type": "quantitative", "format": text_format} if y_field else None,
            },
        }
        text_layer["encoding"] = {k: v for k, v in text_layer["encoding"].items() if v is not None}

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
            "data": {"values": data_records},
            "layer": [arc_layer, text_layer],
            "config": {
                "view": {"stroke": "transparent"},
                "font": "Inter, Roboto, sans-serif",
                "axis": {"domainColor": "#e2e8f0", "tickColor": "#e2e8f0"},
            },
        }

    encoding: dict[str, Any] = {}
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
        y_scale: dict[str, Any] = {}
        if data_records and isinstance(data_records, list):
            y_nums = [r.get(y_field) for r in data_records if isinstance(r.get(y_field), (int, float))]
            if len(y_nums) >= 2:
                y_min, y_max = min(y_nums), max(y_nums)
                if y_min > 0 and y_max > 0:
                    rel_diff = (y_max - y_min) / y_max
                    # If values are tightly clustered (less than 25% variation), don't force zero baseline
                    if rel_diff < 0.25 and rel_diff > 0:
                        y_scale = {"zero": False}

        encoding["y"] = {
            "field": y_field,
            "type": "quantitative",
            "scale": y_scale if y_scale else {"zero": True},
            "axis": {
                "format": "~s",
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

        # Build a global column inventory lookup from all registered views & tables
        all_known_cols: set[str] = set()
        for cols_list in table_columns.values():
            all_known_cols.update(cols_list)
        all_known_cols.update(unified_cols)

        # Build a global column -> type lookup for temporal detection
        all_col_types: dict[str, str] = {}
        for _t_cols in table_column_types.values():
            all_col_types.update(_t_cols)

        numeric_types = {"INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "NUMERIC", "HUGEINT", "TINYINT", "SMALLINT", "INT", "INT4", "INT8", "FLOAT4", "FLOAT8", "REAL"}
        numeric_cols = {col for col, dtype in all_col_types.items() if any(nt in str(dtype).upper() for nt in numeric_types)}

        # Helper to resolve actual DuckDB column name matching user/LLM field name
        def _resolve_col_name(field_name: str | None) -> str | None:
            if not field_name:
                return None
            if field_name in all_known_cols:
                return field_name
            f_lower = field_name.strip().lower()
            for c in all_known_cols:
                if c.lower() == f_lower:
                    return c
            f_norm = re.sub(r'[\s_\-]+', '', f_lower)
            for c in all_known_cols:
                if re.sub(r'[\s_\-]+', '', c.lower()) == f_norm:
                    return c
            for c in all_known_cols:
                c_lower = c.lower()
                if f_lower == c_lower.replace('_', ' ') or f_lower.replace(' ', '_') == c_lower:
                    return c
            return field_name

        # Helper to resolve table for columns
        def _find_query_source(cols: list[str]) -> str:
            resolved_cols = [_resolve_col_name(c) for c in cols if c]
            # 1. Check if all columns exist in a single table
            for t_name, t_cols in table_columns.items():
                t_cols_lower = {c.lower(): c for c in t_cols}
                if all((c and c.lower() in t_cols_lower) for c in resolved_cols if c):
                    return f'"{t_name}"'
            # 2. If unified analytics view exists and has columns, use it
            if unified_cols:
                unified_lower = {c.lower(): c for c in unified_cols}
                if all((c and c.lower() in unified_lower) for c in resolved_cols if c):
                    return '"_unified_analytics"'
            # 3. Fallback to any table with at least one column
            for t_name, t_cols in table_columns.items():
                t_cols_lower = {c.lower(): c for c in t_cols}
                if any((c and c.lower() in t_cols_lower) for c in resolved_cols if c):
                    return f'"{t_name}"'
            if unified_cols:
                return '"_unified_analytics"'
            first_tbl = list(table_columns.keys())[0] if table_columns else "data"
            return f'"{first_tbl}"'

        # Helper to build robust WHERE clauses across single & joined tables
        def _build_where_clause(target_src: str, f_field: str | None, f_val: Any, is_date: bool = False) -> tuple[str, str]:
            if not filter_active or not f_field or f_val is None:
                return ("", target_src)

            src_raw = target_src.strip('"')
            src_cols = table_columns.get(src_raw, list(unified_cols) if src_raw == "_unified_analytics" else list(all_known_cols))

            matching_col = None
            f_lower = f_field.strip().lower()
            f_norm = re.sub(r'[\s_\-]+', '', f_lower)
            for c in src_cols:
                if c.lower() == f_lower or re.sub(r'[\s_\-]+', '', c.lower()) == f_norm:
                    matching_col = c
                    break

            actual_src = target_src
            if not matching_col and unified_cols and target_src != '"_unified_analytics"':
                for c in unified_cols:
                    if c.lower() == f_lower or re.sub(r'[\s_\-]+', '', c.lower()) == f_norm:
                        matching_col = c
                        actual_src = '"_unified_analytics"'
                        break

            if not matching_col:
                matching_col = _resolve_col_name(f_field)
                if matching_col and unified_cols:
                    actual_src = '"_unified_analytics"'

            if not matching_col:
                return ("", target_src)

            escaped_val = str(f_val).replace("'", "''").strip()
            if is_date or re.match(r"^\d{4}-\d{2}-\d{2}", escaped_val):
                return (f"WHERE strftime(\"{matching_col}\"::TIMESTAMP, '%Y-%m-%d') = '{escaped_val[:10]}'", actual_src)
            else:
                return (f"WHERE LOWER(TRIM(CAST(\"{matching_col}\" AS VARCHAR))) = LOWER(TRIM('{escaped_val}'))", actual_src)

        # 1. Hydrate Filter Options
        filter_spec = spec.get("filter") or {}
        filter_field = _resolve_col_name(filter_spec.get("field"))
        filter_table = filter_spec.get("table")

        filter_options = ["All"]
        is_filter_date = False
        if filter_field:
            filter_src = _find_query_source([filter_field]) if not filter_table else f'"{filter_table}"'
            try:
                try:
                    col_info = con.execute(f"DESCRIBE SELECT \"{filter_field}\" FROM {filter_src} LIMIT 1").df()
                    dtype_str = str(col_info.iloc[0]["column_type"]).upper()
                    if any(t in dtype_str for t in ("DATE", "TIMESTAMP", "TIME")):
                        is_filter_date = True
                except Exception:
                    pass

                if is_filter_date:
                    opt_df = _execute_safe_query(
                        con,
                        f"SELECT DISTINCT strftime(\"{filter_field}\"::TIMESTAMP, '%Y-%m-%d') AS val FROM {filter_src} WHERE \"{filter_field}\" IS NOT NULL ORDER BY val LIMIT 100",
                    )
                else:
                    opt_df = _execute_safe_query(
                        con,
                        f"SELECT DISTINCT \"{filter_field}\" AS val FROM {filter_src} WHERE \"{filter_field}\" IS NOT NULL ORDER BY val LIMIT 100",
                    )
                raw_opts = opt_df["val"].dropna().tolist()
                clean_opts = []
                for v in raw_opts:
                    s_val = str(v)
                    if re.match(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}", s_val):
                        s_val = s_val[:10]
                    if s_val not in clean_opts:
                        clean_opts.append(s_val)
                filter_options = ["All"] + clean_opts
            except Exception as e:
                logger.warning("Failed to fetch filter options: %s", e)

        filter_spec["options"] = filter_options
        filter_spec["selected_value"] = filter_value or "All"
        spec["filter"] = filter_spec

        filter_active = filter_value and str(filter_value).strip().lower() not in ("all", "", "none")

        # 2. Hydrate Exactly 4 KPIs (with Calculated Metrics & Expression Support)
        hydrated_kpis = []
        for kpi in spec.get("kpis", [])[:4]:
            t_name = kpi.get("table")
            measure = _resolve_col_name(kpi.get("measure_column"))
            expr = kpi.get("expression") or kpi.get("formula")
            agg = (kpi.get("aggregation") or "SUM").upper()
            fmt = kpi.get("format") or "number"

            # Smart aggregation override based on column semantics
            if measure and not expr:
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
                elif any(k in m_lower for k in ("cost", "price", "revenue", "salary", "wage", "budget", "spend", "profit", "margin")) and fmt not in ("currency",):
                    fmt = "currency"

            val_formatted = "N/A"
            raw_val = None

            if measure or expr:
                agg_expr, ref_cols = _parse_and_build_metric_sql(
                    agg=agg,
                    measure_column=measure,
                    expression=expr,
                    all_known_cols=all_known_cols,
                )

                # Find appropriate source table/view
                needed_cols = list(ref_cols) if ref_cols else ([measure] if measure else [])
                if filter_active and filter_field:
                    needed_cols.append(filter_field)
                target_src = _find_query_source(needed_cols)

                where_clause, target_src = _build_where_clause(target_src, filter_field, filter_value, is_filter_date)

                sql = f"SELECT {agg_expr} AS kpi_val FROM {target_src} {where_clause}"
                try:
                    k_df = _execute_safe_query(con, sql)
                    if not k_df.empty:
                        raw_val = k_df.iloc[0]["kpi_val"]
                        val_formatted, raw_val = _format_metric_value(raw_val, fmt, measure_name=measure or expr or "", title=kpi.get("title") or "")
                except Exception as e:
                    logger.warning("KPI '%s' query failed with filter (%s). Retrying fallback query.", kpi.get("title"), e)
                    try:
                        fallback_sql = f"SELECT {agg_expr} AS kpi_val FROM {target_src}"
                        k_df = _execute_safe_query(con, fallback_sql)
                        if not k_df.empty:
                            raw_val = k_df.iloc[0]["kpi_val"]
                            val_formatted, raw_val = _format_metric_value(raw_val, fmt, measure_name=measure or expr or "", title=kpi.get("title") or "")
                    except Exception as fb_err:
                        logger.warning("Error calculating fallback KPI '%s': %s", kpi.get("title"), fb_err)

            hydrated_kpis.append({
                "id": kpi.get("id", str(uuid.uuid4())),
                "title": kpi.get("title", "KPI Metric"),
                "table": t_name,
                "measure_column": measure,
                "expression": expr,
                "aggregation": agg,
                "format": fmt,
                "formatted_value": val_formatted,
                "raw_value": make_json_safe(raw_val),
                "subtitle": kpi.get("subtitle", f"{agg} of {measure or expr}"),
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

        # 3. Hydrate Exactly 6 Visualizations (with Calculated Metric Support)
        hydrated_visuals = []
        for viz in spec.get("visualizations", [])[:6]:
            v_title = viz.get("title", "Chart")
            t_name = viz.get("table")
            c_type = viz.get("chart_type", "bar")
            x_col = _resolve_col_name(viz.get("x_field"))
            y_col = _resolve_col_name(viz.get("y_field"))
            expr = viz.get("expression") or viz.get("formula")
            color_col = _resolve_col_name(viz.get("color_field"))
            agg = (viz.get("aggregation") or "SUM").upper()

            # Smart aggregation override for y-axis based on column semantics
            if y_col and not expr:
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

            # Prevent temporal columns from being assigned to pie/donut charts
            if x_is_temporal and c_type in ("pie", "donut"):
                c_type = "line"
                logger.info("Overrode chart_type for temporal field '%s': pie/donut -> line", x_col)

            # Pre-flight: check column existence
            missing_cols = []
            for col_name, col_label in [(x_col, "x_field")]:
                if col_name and col_name not in all_known_cols:
                    missing_cols.append(f"{col_label}='{col_name}'")
            if not expr and y_col and y_col not in all_known_cols:
                missing_cols.append(f"y_field='{y_col}'")

            if missing_cols:
                query_status = "column_not_found"
                query_error_detail = f"Missing columns: {', '.join(missing_cols)}"
                logger.warning("Chart '%s': %s", v_title, query_error_detail)

            if x_col and (y_col or expr) and query_status == "ok":
                y_agg_expr, y_ref_cols = _parse_and_build_metric_sql(
                    agg=agg,
                    measure_column=y_col,
                    expression=expr,
                    all_known_cols=all_known_cols,
                )

                needed_cols = [x_col] + y_ref_cols
                if color_col and color_col in all_known_cols:
                    needed_cols.append(color_col)
                elif color_col and color_col not in all_known_cols:
                    color_col = None  # Drop invalid color field silently
                if filter_active and filter_field:
                    needed_cols.append(filter_field)

                target_src = _find_query_source(needed_cols)
                where_clause, target_src = _build_where_clause(target_src, filter_field, filter_value, is_filter_date)

                chart_y_label = y_col or "metric_val"
                x_valid_cond = f'"{x_col}" IS NOT NULL AND TRIM(CAST("{x_col}" AS VARCHAR)) NOT IN (\'\', \'NaN\', \'None\', \'null\', \'NAT\', \'undefined\')'
                y_valid_cond = f'"{chart_y_label}" IS NOT NULL' if ("COUNT" in y_agg_expr) else f'TRY_CAST("{chart_y_label}" AS DOUBLE) IS NOT NULL' if (chart_y_label in all_known_cols) else "1=1"

                # ── BI Best Practice: Smart query construction per chart type ──
                if c_type in ("pie", "donut"):
                    # Pie/Donut: limit to top 7 slices, group the rest as "Other", drop nulls
                    where_prefix = f"{where_clause} AND " if where_clause else "WHERE "
                    inner_sql = f"""
                    SELECT \"{x_col}\", {y_agg_expr} AS \"{y_col}\"
                    FROM {target_src}
                    {where_prefix} {x_valid_cond} AND {y_valid_cond}
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
                elif x_is_temporal:
                    # Temporal line/area/column: Try month first. If data spans <= 2 months, drill down to day
                    where_prefix = f"{where_clause} AND " if where_clause else "WHERE "
                    group_cols_parts = [f'strftime(DATE_TRUNC(\'month\', "{x_col}"::TIMESTAMP), \'%b %Y\') AS "{x_col}"']
                    group_by_parts = [f'DATE_TRUNC(\'month\', "{x_col}"::TIMESTAMP)', f'strftime(DATE_TRUNC(\'month\', "{x_col}"::TIMESTAMP), \'%b %Y\')']
                    if color_col and color_col != x_col:
                        group_cols_parts.append(f'"{color_col}"')
                        group_by_parts.append(f'"{color_col}"')
                    select_str = ", ".join(group_cols_parts)
                    group_by_str = ", ".join(group_by_parts)
                    sql = f"""
                    SELECT {select_str}, {y_agg_expr} AS "{y_col}"
                    FROM {target_src}
                    {where_prefix} {x_valid_cond} AND {y_valid_cond}
                    GROUP BY {group_by_str}
                    ORDER BY DATE_TRUNC('month', "{x_col}"::TIMESTAMP) ASC
                    LIMIT 36
                    """
                elif c_type in ("line", "area"):
                    # Non-temporal line/area: sort along natural X-axis sequence rather than Y metric DESC
                    group_cols = [f'"{x_col}"']
                    group_by_cols = [f'"{x_col}"']
                    if color_col and color_col != x_col:
                        group_cols.append(f'"{color_col}"')
                        group_by_cols.append(f'"{color_col}"')
                    group_str = ", ".join(group_cols)
                    group_by_str = ", ".join(group_by_cols)
                    where_prefix = f"{where_clause} AND " if where_clause else "WHERE "
                    sql = f"""
                    SELECT {group_str}, {y_agg_expr} AS "{y_col}"
                    FROM {target_src}
                    {where_prefix} {x_valid_cond} AND {y_valid_cond}
                    GROUP BY {group_by_str}
                    ORDER BY "{x_col}" ASC
                    LIMIT 30
                    """
                else:
                    # Bar/scatter/other: standard categorical query, top N
                    row_limit = 15 if c_type in ("bar", "column") else 30
                    group_cols = [f'"{x_col}"']
                    if color_col and color_col != x_col:
                        group_cols.append(f'"{color_col}"')
                    group_str = ", ".join(group_cols)
                    where_prefix = f"{where_clause} AND " if where_clause else "WHERE "
                    sql = f"""
                    SELECT {group_str}, {y_agg_expr} AS "{y_col}"
                    FROM {target_src}
                    {where_prefix} {x_valid_cond} AND {y_valid_cond}
                    GROUP BY {group_str}
                    ORDER BY "{y_col}" DESC
                    LIMIT {row_limit}
                    """

                try:
                    v_df = _execute_safe_query(con, sql)
                    if not v_df.empty:
                        v_df = v_df.dropna(subset=[x_col, y_col])
                        if x_col in v_df.columns:
                            v_df = v_df[~v_df[x_col].astype(str).str.lower().isin(['nan', 'none', 'null', 'nat', 'undefined', ''])]
                    records = df_to_safe_records(v_df)

                    # Adaptive time-series resolution: if monthly grouping gave <= 2 points, drill down to daily points
                    if x_is_temporal and len(records) <= 2:
                        where_prefix = f"{where_clause} AND " if where_clause else "WHERE "
                        day_sql = f"""
                        SELECT strftime("{x_col}"::TIMESTAMP, '%d %b') AS "{x_col}",
                               {y_agg_expr} AS "{y_col}"
                               {f', "{color_col}"' if color_col and color_col != x_col else ''}
                        FROM {target_src}
                        {where_prefix} {x_valid_cond} AND {y_valid_cond}
                        GROUP BY strftime("{x_col}"::TIMESTAMP, '%d %b'), DATE_TRUNC('day', "{x_col}"::TIMESTAMP){f', "{color_col}"' if color_col and color_col != x_col else ''}
                        ORDER BY DATE_TRUNC('day', "{x_col}"::TIMESTAMP) ASC
                        LIMIT 31
                        """
                        try:
                            day_df = _execute_safe_query(con, day_sql)
                            if not day_df.empty:
                                day_df = day_df.dropna(subset=[x_col, y_col])
                                if x_col in day_df.columns:
                                    day_df = day_df[~day_df[x_col].astype(str).str.lower().isin(['nan', 'none', 'null', 'nat', 'undefined', ''])]
                            day_records = df_to_safe_records(day_df)
                            if len(day_records) > len(records):
                                records = day_records
                        except Exception as day_err:
                            logger.debug("Day drilldown fallback error: %s", day_err)

                    if not records:
                        query_status = "no_data"
                except Exception as e:
                    logger.warning("Chart query with filter failed (%s). Retrying fallback query.", e)
                    # Fallback: simple query without temporal aggregation or where clause
                    try:
                        group_cols_fb = [f'"{x_col}"']
                        if color_col and color_col != x_col:
                            group_cols_fb.append(f'"{color_col}"')
                        group_str_fb = ", ".join(group_cols_fb)
                        fb_sql = f"""
                        SELECT {group_str_fb}, {y_agg_expr} AS "{y_col}"
                        FROM {target_src}
                        WHERE {x_valid_cond} AND {y_valid_cond}
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

            # If a line chart still has only 1 data point after query execution, convert to bar chart
            if c_type in ("line", "area") and len(records) <= 1:
                c_type = "bar"

            hydrated_visuals.append({
                "id": viz.get("id", str(uuid.uuid4())),
                "title": v_title,
                "description": viz.get("description", ""),
                "table": t_name,
                "chart_type": c_type,
                "theme_id": viz.get("theme_id"),
                "expression": expr,
                "x_field": x_col,
                "y_field": y_col,
                "color_field": color_col,
                "aggregation": agg,
                "data": records,
                "is_temporal": x_is_temporal,
                "_query_status": query_status,
                "_query_error": query_error_detail if query_error_detail else None,
            })

        # Automated Diversity Balancer: Ensure a balanced mix of visual types across the 6 charts
        chart_type_counts: dict[str, int] = {}
        for hv in hydrated_visuals:
            ct = hv["chart_type"]
            chart_type_counts[ct] = chart_type_counts.get(ct, 0) + 1

        donut_count = chart_type_counts.get("donut", 0) + chart_type_counts.get("pie", 0)
        line_count = chart_type_counts.get("line", 0) + chart_type_counts.get("area", 0)

        # 1. Promote suitable low-cardinality categorical bar charts to donut/pie if donut count < 2
        if donut_count < 2:
            for hv in hydrated_visuals:
                if donut_count >= 2:
                    break
                if hv["chart_type"] in ("bar", "column") and not hv.get("is_temporal"):
                    rec_count = len(hv.get("data", []))
                    t_lower = hv["title"].lower()
                    x_lower = (hv["x_field"] or "").lower()
                    # Check if candidates are low cardinality (2 to 7 records) or composition-oriented
                    is_composition = any(k in t_lower or k in x_lower for k in ("distribution", "breakdown", "status", "mode", "type", "category", "share", "gender", "department", "tier", "role"))
                    if 2 <= rec_count <= 7 or (is_composition and 2 <= rec_count <= 8):
                        hv["chart_type"] = "donut"
                        donut_count += 1
                        logger.info("Automated diversity balancer: promoted '%s' from bar to donut (%d slices)", hv["title"], rec_count)

        # 2. Promote suitable multi-period temporal bar charts to line/area if line count < 2
        if line_count < 2:
            for hv in hydrated_visuals:
                if line_count >= 2:
                    break
                if hv["chart_type"] in ("bar", "column") and hv.get("is_temporal"):
                    rec_count = len(hv.get("data", []))
                    if rec_count >= 3:
                        hv["chart_type"] = "line" if line_count == 0 else "area"
                        line_count += 1
                        logger.info("Automated diversity balancer: promoted temporal '%s' from bar to %s (%d points)", hv["title"], hv["chart_type"], rec_count)

        # Build Vega-Lite specifications with finalized diverse chart types & theme palettes
        for hv in hydrated_visuals:
            hv["vega_spec"] = _build_vega_lite_spec(
                hv["title"],
                hv["chart_type"],
                hv["x_field"],
                hv["y_field"],
                hv["color_field"],
                hv["data"],
                is_temporal=hv.get("is_temporal", False),
                theme_id=hv.get("theme_id"),
            )
            hv.pop("is_temporal", None)

        while len(hydrated_visuals) < 6:
            pad_type = "donut" if donut_count < 2 else ("line" if line_count < 2 else "bar")
            hydrated_visuals.append({
                "id": f"viz_pad_{len(hydrated_visuals)}",
                "title": f"Visualization {len(hydrated_visuals)+1}",
                "description": "Additional analytical perspective",
                "chart_type": pad_type,
                "data": [],
                "vega_spec": _build_vega_lite_spec(f"Visualization {len(hydrated_visuals)+1}", pad_type, None, None, None, []),
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
    identity_id = _safe_get_identity_id()

    data = request.get_json() or {}
    table_names = data.get("tables", [])
    requested_ws_id = data.get("workspace_id")

    if not table_names:
        raise AppError(ErrorCode.INVALID_REQUEST, "Please select at least one table")

    try:
        workspace = _get_or_create_workspace(identity_id, requested_ws_id)
        profile = _build_full_profile(workspace, table_names, identity_id)
        return json_ok({"profile": profile})
    except AppError:
        raise
    except Exception as exc:
        logger.error("Error profiling data: %s", exc, exc_info=True)
        raise AppError(ErrorCode.DATA_LOAD_ERROR, f"Failed to profile tables: {exc}") from exc


def _build_heuristic_suggestions(profile: dict[str, Any]) -> list[dict[str, Any]]:
    """Build high-quality rule-based fallback suggestions from data profile."""
    suggestions = []
    tables = profile.get("tables", [])
    if not tables:
        return []

    t0 = tables[0]
    t_name = t0.get("table_name", "Data")
    measures = t0.get("measures", [])
    dimensions = t0.get("dimensions", [])
    temporal = t0.get("temporal_columns", [])

    clean_name = t_name.replace("_", " ").title()

    # Suggestion 1: Executive Overview (Strategic)
    suggestions.append({
        "id": "executive_overview",
        "category": "Strategic",
        "title": f"{clean_name} Overview",
        "description": f"Comprehensive overview of {clean_name} key performance indicators and metrics.",
        "prompt": f"Create an executive overview dashboard analyzing all key metrics in {t_name}.",
        "reason": f"Provides high-level insights for {t_name}",
        "focus_metrics": measures[:2],
    })

    # Suggestion 2: Breakdown by Dimension (Operational)
    if dimensions:
        dim = dimensions[0].replace("_", " ").title()
        suggestions.append({
            "id": "dimension_breakdown",
            "category": "Operational",
            "title": f"{clean_name} by {dim}",
            "description": f"Analyze metrics distribution and performance segmented across {dim.lower()}.",
            "prompt": f"Create a dashboard analyzing {t_name} broken down by {dimensions[0]}.",
            "reason": f"Reveals segment patterns across {dim}",
            "focus_metrics": [dimensions[0]] + measures[:1],
        })

    # Suggestion 3: Temporal Trends (Trends)
    if temporal:
        date_col = temporal[0].replace("_", " ").title()
        suggestions.append({
            "id": "temporal_trends",
            "category": "Trends",
            "title": f"{clean_name} Trends Over Time",
            "description": f"Track temporal dynamics and trajectory across {date_col.lower()}.",
            "prompt": f"Create a timeline dashboard showing {t_name} trends and fluctuations over {temporal[0]}.",
            "reason": f"Identifies trajectory and periodicity over time",
            "focus_metrics": [temporal[0]] + measures[:1],
        })
    elif len(measures) >= 2:
        m2 = measures[1].replace("_", " ").title()
        suggestions.append({
            "id": "measure_analysis",
            "category": "Financial",
            "title": f"{m2} Comparative Analysis",
            "description": f"In-depth analysis focusing on {m2.lower()} performance and variance.",
            "prompt": f"Create a dashboard analyzing {measures[1]} in relation to other factors in {t_name}.",
            "reason": f"Explores critical metric {m2}",
            "focus_metrics": measures[:2],
        })

    # Suggestion 4: Distribution / Summary (Risk & Capacity)
    if len(dimensions) >= 2:
        dim2 = dimensions[1].replace("_", " ").title()
        suggestions.append({
            "id": "category_distribution",
            "category": "Risk",
            "title": f"{dim2} Distribution & Capacity",
            "description": f"Examine distribution patterns and resource allocation across {dim2.lower()}.",
            "prompt": f"Create a summary dashboard examining {t_name} patterns across {dimensions[1]}.",
            "reason": f"Analyzes distribution across {dim2}",
            "focus_metrics": [dimensions[1]],
        })
    elif len(suggestions) < 4:
        suggestions.append({
            "id": "summary_analysis",
            "category": "Operational",
            "title": f"{clean_name} Detailed Analysis",
            "description": f"Multi-dimensional analysis of key metrics across {clean_name}.",
            "prompt": f"Create a detailed multi-chart analytics dashboard for {t_name}.",
            "reason": f"Full metric exploration for {t_name}",
            "focus_metrics": measures[:1],
        })

    return suggestions[:4]


@intelligence_bp.route("/suggestions", methods=["POST"])
def generate_suggestions():
    """Generate dynamic, intelligent dashboard suggestions based on data profile."""
    data = request.get_json() or {}
    profile = data.get("profile")
    model_config = data.get("model")

    if not profile or not profile.get("tables"):
        raise AppError(ErrorCode.INVALID_REQUEST, "Valid data profile is required")

    summary_tables = []
    for t in profile.get("tables", []):
        col_summaries = []
        for c in t.get("columns", []):
            info: dict[str, Any] = {
                "name": c["name"],
                "type": c["type"],
                "semantic_type": c["semantic_type"],
            }
            if c.get("distinct_count") is not None:
                info["distinct_count"] = c["distinct_count"]
            sample_vals = c.get("sample_values", [])
            if sample_vals:
                info["sample_values"] = sample_vals[:8]
            if c.get("statistics"):
                info["statistics"] = c["statistics"]
            if c.get("null_percentage", 0) > 5:
                info["null_percentage"] = c["null_percentage"]
            col_summaries.append(info)

        summary_tables.append({
            "name": t["table_name"],
            "row_count": t["row_count"],
            "measures": t.get("measures", []),
            "dimensions": t.get("dimensions", []),
            "temporal_columns": t.get("temporal_columns", []),
            "columns": col_summaries,
            "sample_records": t.get("sample_records", [])[:3],
        })

    relationships = profile.get("inferred_relationships", [])

    try:
        client = _get_client_from_request(model_config)
        lang_inst = build_language_instruction(_get_ui_lang(), mode="full")

        system_prompt = f"""You are an elite Chief Analytics Officer and Executive BI Architect for InsightCanvas.
Your mission is to analyze the provided dataset schema, column sample values, and cross-table relationships, and propose 4 to 5 sharp, domain-tailored, decision-oriented dashboard concepts.

DECISION-ORIENTED ANALYTICAL ARCHETYPES:
Craft suggestions representing distinct analytical archetypes to give the user diverse perspectives:
1. "Strategic": Executive health, top-line performance indicators, high-level scorecard, cross-department/segment health.
2. "Operational": Workflow throughput, efficiency bottlenecks, machine/human capacity utilization, cycle times, idle rates.
3. "Financial": Margin performance, unit economics, cost concentration, pricing variance, budget vs actuals.
4. "Trends": Multi-period trajectory, seasonality, cyclical fluctuations, momentum, pacing over time.
5. "Risk": Outlier detection, failure rates, threshold breaches, volatility, defect rates, bottom 10% laggards.

CRITICAL INSTRUCTIONS:
- DOMAIN SENSITIVITY: Inspect the actual column names, sample values, AND statistics (min/max/mean/stddev for numeric, top_values for categorical, date_range for temporal). Use vocabulary authentic to the specific industry.
- MULTI-TABLE SYNERGY: When multiple tables and relationships exist, propose cross-table dashboards that join fact metrics with dimension attributes (e.g. Product Line Profitability by Customer Region).
- STATISTICS-AWARE SUGGESTIONS: Use the 'statistics' field to craft smarter suggestions:
  * For numeric columns with high stddev: suggest variance/outlier analysis dashboards.
  * For temporal columns with date_range_days > 90: suggest trend analysis over time.
  * For categorical columns with even distribution in top_values: suggest comparative breakdowns.
  * Avoid suggesting analysis on columns with null_percentage > 50%%.
- AVOID GENERIC TITLES: Do NOT output boring titles like "Data Overview" or "Table Analysis". Use vivid, executive-grade titles (e.g., "Factory Capacity & Downtime Intelligence", "Revenue & Margin Compression Analysis", "Customer Acquisition & Churn Dynamics").
- CONCISE & ACTIONABLE: Every prompt must be ready to feed into the dashboard generator.

Return ONLY valid JSON matching this schema:
{{
  "suggestions": [
    {{
      "id": "unique_snake_case_id",
      "category": "Strategic",
      "title": "Clear Inspiring Title (3-5 words)",
      "description": "1 compelling sentence summarizing what operational decisions this dashboard enables.",
      "prompt": "The natural language instruction to generate this exact dashboard.",
      "reason": "Why this is critical given the detected columns and sample distributions.",
      "focus_metrics": ["col_or_measure_1", "col_or_dimension_2"]
    }}
  ]
}}
"""
        system_prompt = inject_language_instruction(system_prompt, lang_inst)
        query_payload = {
            "tables": summary_tables,
            "relationships": relationships,
        }
        user_query = f"Dataset Profile & Relationships:\n{json.dumps(query_payload, ensure_ascii=False, indent=2)}"

        response = client.get_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            reasoning_effort=reasoning_effort_for("analyst", client.model),
        )
        content = response.choices[0].message.content or ""
        json_objs = extract_json_objects(content)
        raw_suggestions = None
        if json_objs and "suggestions" in json_objs[0] and json_objs[0]["suggestions"]:
            raw_suggestions = json_objs[0]["suggestions"]
        else:
            parsed = json.loads(content)
            if "suggestions" in parsed and parsed["suggestions"]:
                raw_suggestions = parsed["suggestions"]

        if raw_suggestions:
            # Normalize categories
            valid_categories = {"Strategic", "Operational", "Financial", "Trends", "Risk"}
            for s in raw_suggestions:
                cat = s.get("category", "")
                if cat not in valid_categories:
                    cat_lower = str(cat).lower()
                    if "strat" in cat_lower or "exec" in cat_lower:
                        s["category"] = "Strategic"
                    elif "oper" in cat_lower or "effic" in cat_lower:
                        s["category"] = "Operational"
                    elif "finan" in cat_lower or "cost" in cat_lower or "rev" in cat_lower:
                        s["category"] = "Financial"
                    elif "trend" in cat_lower or "time" in cat_lower:
                        s["category"] = "Trends"
                    elif "risk" in cat_lower or "outlier" in cat_lower:
                        s["category"] = "Risk"
                    else:
                        s["category"] = "Strategic"
            return json_ok({"suggestions": raw_suggestions})

        return json_ok({"suggestions": _build_heuristic_suggestions(profile)})
    except Exception as exc:
        logger.warning("Error generating LLM suggestions: %s, using heuristic suggestions", exc)
        return json_ok({"suggestions": _build_heuristic_suggestions(profile)})


@intelligence_bp.route("/generate-dashboard", methods=["POST"])
def generate_dashboard():
    """Generate structured dashboard specification from user prompt & data profile."""
    identity_id = _safe_get_identity_id()

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
                col_info["sample_values"] = sample_vals[:5]
            if c.get("statistics"):
                col_info["statistics"] = c["statistics"]
            if c.get("null_percentage", 0) > 5:
                col_info["null_percentage"] = c["null_percentage"]
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

    # 1. Deterministic Domain Guard: Immediately detect requests for unrelated domains (e.g. patients on sales data)
    mismatch_error = _detect_domain_mismatch(user_prompt, profile)
    if mismatch_error:
        logger.info("Deterministic domain mismatch caught: %s", mismatch_error)
        raise AppError(ErrorCode.INVALID_REQUEST, mismatch_error)

    system_prompt = f"""You are an expert dashboard and analytics architect for InsightCanvas.
Given the dataset profile and the user's analytical goal, synthesize a complete, highly meaningful dashboard specification.

DOMAIN RELEVANCE & MISMATCH DETECTION (CRITICAL):
- Carefully check if the user's request is relevant to the domain and tables present in the provided schema.
- If the user's request asks for entities, topics, or domains that DO NOT EXIST in the provided dataset (e.g. asking for "patients / healthcare / medical / hospital" when the tables only contain sales, orders, or configuration, or asking for "crypto / stock market" when tables contain HR):
  - Do NOT hallucinate or silently ignore the user's request.
  - Do NOT generate an unrelated dashboard using the existing tables.
  - Instead, set "is_domain_compatible": false, and write a clear "mismatch_reason":
    "The selected data contains <brief summary of active table domains>, which does not contain data about '<requested topic>'. Please select a dataset related to <requested topic> or request insights based on the available tables."
  - Set "title": "", "kpis": [], "visualizations": [].
- If the user's request is compatible or general analytical intent, set "is_domain_compatible": true, "mismatch_reason": null, and generate the full dashboard.

LAYOUT REQUIREMENTS (STRICT):
1. **1 Top-Level Filter**: Select the single most useful categorical or date dimension field across the data (e.g. Region, Department, Category, Year, Status).
2. **Exactly 4 KPI Cards**: Pick the 4 most critical summary metrics. Choose appropriate aggregations (SUM, AVG, COUNT, MIN, MAX) and formatting ('currency', 'number', 'percent', 'integer').
3. **Exactly 6 Visualizations** (3 in Row 1, 3 in Row 2):
   - CHART TYPE SELECTION GUIDE (10 supported types — use the BEST fit for each data pattern):
     * 'bar': Vertical bars for categorical comparison with 5-15 categories. Default for ranked lists.
     * 'horizontal_bar': Horizontal bars for long category labels or leaderboard-style rankings.
     * 'line': Smooth connected line for temporal trends. Use for time-series with 3+ time periods.
     * 'step_line': Stepped line for discrete state changes or staged metrics (e.g. pricing tiers, status transitions).
     * 'area': Filled area under line for volume/cumulative trends over time.
     * 'donut': Ring chart for proportional breakdowns. Use ONLY when distinct_count <= 7.
     * 'pie': Slice chart for part-of-whole analysis. Use ONLY when distinct_count <= 7.
     * 'scatter': Point cloud for 2-variable numeric correlation analysis.
     * 'dot_plot': Labeled point benchmarks for direct value comparison across categories.
     * 'boxplot': Box-and-whisker for distribution spread, quartiles, outliers of a numeric measure across groups.
   - MANDATORY DIVERSITY RULE:
     * You MUST use at least 4 DISTINCT chart types across the 6 visual cards!
     * Include 1-2 composition charts (donut/pie) for low-cardinality dimensions (CHECK the 'distinct_count' field — must be <= 7).
     * Include 1-2 trend charts (line/area/step_line) when temporal columns exist with date_range_days > 30 in statistics.
     * Include 2-3 comparison/analysis charts (bar/horizontal_bar/scatter/dot_plot/boxplot).
     * NEVER output all 'bar' charts.
   - TEMPORAL RULES:
     * For time-series data: ALWAYS use 'line', 'area', or 'step_line'. NEVER use 'pie' or 'donut' for temporal fields.
     * If a date column has date_range_days < 7 in statistics (single snapshot), use 'bar' or 'donut' by a category instead.
   - CARDINALITY RULES (use distinct_count and statistics.top_values):
     * distinct_count <= 7: ideal for 'donut' or 'pie'
     * distinct_count 3-15: ideal for 'bar' or 'horizontal_bar'
     * distinct_count > 15: use 'bar' with top-N grouping, 'scatter', or 'boxplot'
     * If statistics.top_values shows one category > 80%%, that field is a poor chart axis — choose a different dimension.
   - ALWAYS assign dimension/categorical columns to x_field and numeric/measure columns to y_field.
   - Ensure high analytical value and zero redundancy.

CRITICAL COLUMN RULES:
- ONLY use table names and column names that ACTUALLY EXIST in the provided schema below.
- Do NOT invent, guess, or hallucinate column names. Every x_field, y_field, color_field, and measure_column MUST match an exact column name from the schema.
- Use the 'sample_values', 'distinct_count', AND 'statistics' fields to understand data distribution and make optimal decisions.
- For KPIs: use measure (numeric) columns with SUM/AVG/MAX/MIN aggregation, or use identifier columns with COUNT aggregation.
- For visualizations: x_field should be a dimension/categorical column, y_field should be a numeric/measure column.
- Columns with null_percentage > 50%% are poor choices for primary KPIs or chart axes — prefer columns with low null rates.

STATISTICS-DRIVEN DECISIONS (use the 'statistics' field in each column):
- For numeric columns: statistics contains min, max, mean, median, stddev. Use these to:
  * Pick appropriate aggregation: if stddev is low relative to mean, AVG is meaningful; if high, consider using a boxplot.
  * Choose number formatting based on min/max range (millions → use abbreviations).
  * Identify if a measure is worth charting (if min == max, it's constant — skip it).
- For categorical columns: statistics.top_values shows frequency distribution. Use these to:
  * Decide between donut (<=7 categories) vs bar chart (8+ categories).
  * Identify if one category dominates (>80%%) — such fields make poor chart axes.
- For temporal columns: statistics contains min_date, max_date, date_range_days. Use these to:
  * Choose line/area for long date ranges (30+ days).
  * Choose bar/donut for single-point snapshots (date_range_days < 7).

AGGREGATION & CALCULATED METRICS RULES:
- For columns containing rates, percentages, ratios, or averages (e.g. utilization_percentage, defect_rate, efficiency_score): use AVG, never SUM.
- For columns that are counts or quantities (e.g. total_output, units_produced, quantity): use SUM.
- For ID or key columns: use COUNT(DISTINCT).
- For monetary/currency columns (e.g. cost, price, revenue, salary): use SUM for totals, AVG for per-unit metrics.
- Match the 'format' field to the data semantics: use 'percent' for rate/percentage measures, 'currency' for monetary, 'integer' for counts.
- CALCULATED & DERIVED METRICS: You may use compound formulas when valuable (e.g. Margin = "revenue - cost", Average Order Value = "sales / orders", Efficiency = "actual_output / target_output"). Specify the formula in "measure_column" (e.g. "revenue - cost") or in "expression" (e.g. "SUM(revenue) - SUM(cost)") and provide an authentic business title.

Return ONLY valid JSON matching this structure:
{{
  "is_domain_compatible": true,
  "mismatch_reason": null,
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
      "chart_type": "bar|horizontal_bar|line|step_line|area|scatter|dot_plot|donut|pie|boxplot",
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
        dashboard_spec = json_objs[0] if json_objs else json.loads(content)

        # Check if the LLM flagged a domain mismatch error
        if isinstance(dashboard_spec, dict):
            if dashboard_spec.get("is_domain_compatible") is False:
                reason = (
                    dashboard_spec.get("mismatch_reason")
                    or dashboard_spec.get("error")
                    or f"The requested topic '{user_prompt}' cannot be fulfilled with the active dataset."
                )
                raise AppError(ErrorCode.INVALID_REQUEST, reason)
            if "error" in dashboard_spec:
                raise AppError(ErrorCode.INVALID_REQUEST, dashboard_spec["error"])

        # Post-LLM validation: ensure generated title/description isn't hallucinating foreign domain entities
        title_text = f"{dashboard_spec.get('title', '')} {dashboard_spec.get('description', '')}"
        post_mismatch = _detect_domain_mismatch(title_text, profile)
        if post_mismatch:
            logger.warning("LLM synthesized dashboard with foreign domain title/desc: %s", post_mismatch)
            raise AppError(ErrorCode.INVALID_REQUEST, post_mismatch)

        # Post-LLM validation: fix hallucinated column names
        dashboard_spec = _validate_and_fix_spec(dashboard_spec, profile)

        # Hydrate spec with data from DuckDB
        hydrated = _hydrate_dashboard_spec(workspace, dashboard_spec, filter_value="All")

        # Self-healing: verify if any KPI or visualization failed due to invalid column names
        broken_kpis = [k for k in hydrated.get("kpis", []) if k.get("formatted_value") == "N/A" or k.get("_query_status") == "error"]
        broken_visuals = [v for v in hydrated.get("visualizations", []) if not v.get("data") and v.get("_query_status") == "error"]

        if broken_kpis or broken_visuals:
            logger.warning(
                "Self-healing triggered: %d broken KPIs, %d broken visualizations detected. Initiating repair pass.",
                len(broken_kpis), len(broken_visuals)
            )
            column_inventory = _build_column_inventory(profile)
            repair_prompt = f"""You previously generated a dashboard specification with invalid column references that caused database query errors.

Broken Items:
{json.dumps({"broken_kpis": broken_kpis, "broken_visualizations": broken_visuals}, indent=2)}

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
    identity_id = _safe_get_identity_id()

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
    identity_id = _safe_get_identity_id()

    data = request.get_json() or {}
    current_dashboard = data.get("current_dashboard")
    user_message = data.get("message", "")
    profile = data.get("profile")
    model_config = data.get("model")
    chat_history = data.get("history", [])

    if not current_dashboard:
        raise AppError(ErrorCode.INVALID_REQUEST, "Current dashboard state is required")

    # Guard against completely unrelated domain requests in follow-up chat
    mismatch_error = _detect_domain_mismatch(user_message, profile)
    if mismatch_error:
        logger.info("Domain mismatch detected in chat: %s", mismatch_error)
        return json_ok({
            "reply": f"I cannot fulfill this request on the current dataset. {mismatch_error}",
            "dashboard": current_dashboard,
        })

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
5. If the user asks for entities, metrics, or domains completely absent from the dataset (e.g. asking for patient or hospital data on HR tables):
   - Keep the updated_dashboard unchanged.
   - In your reply, explain clearly that the active dataset contains <domain> data and does not have information about <requested topic>, and suggest relevant questions based on the available columns.

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
    identity_id = _safe_get_identity_id()

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
    """List all saved Intelligence Hub sessions across current identity and fallback identities."""
    identity_id = _safe_get_identity_id()

    s_dir = _get_sessions_dir(identity_id)
    session_files = list(s_dir.glob("*.json"))

    # Also check client identity header if different
    client_identity = request.headers.get("X-Identity-Id")
    if client_identity:
        val = client_identity.split(":", 1)[-1]
        for candidate_id in [f"browser:{val}", f"user:{val}"]:
            if candidate_id != identity_id:
                try:
                    c_dir = _get_sessions_dir(candidate_id)
                    if c_dir.exists():
                        session_files.extend(list(c_dir.glob("*.json")))
                except Exception:
                    pass

    # Also check local:anonymous if user directory has no sessions
    if not session_files and identity_id != "local:anonymous":
        try:
            anon_dir = _get_sessions_dir("local:anonymous")
            if anon_dir.exists():
                session_files.extend(list(anon_dir.glob("*.json")))
        except Exception:
            pass

    sessions = []
    seen_ids = set()
    for f in session_files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                meta = json.load(fh)
                sid = meta.get("id", f.stem)
                if sid in seen_ids:
                    continue
                seen_ids.add(sid)
                sessions.append({
                    "id": sid,
                    "title": meta.get("title", "Untitled Dashboard"),
                    "source_id": meta.get("source_id"),
                    "database": meta.get("database"),
                    "tables": meta.get("tables", []),
                    "created_at": meta.get("created_at"),
                    "updated_at": meta.get("updated_at"),
                    "prompt": meta.get("prompt"),
                    "pinned": bool(meta.get("pinned", False)),
                    "liked": bool(meta.get("liked", False)),
                })
        except Exception as exc:
            logger.debug("Failed to read session file %s: %s", f, exc)

    # Sort pinned sessions first, then by updated_at / created_at descending
    sessions.sort(
        key=lambda x: (
            1 if x.get("pinned", False) else 0,
            x.get("updated_at") or x.get("created_at") or "",
        ),
        reverse=True,
    )
    return json_ok({"sessions": sessions})


@intelligence_bp.route("/sessions/<session_id>", methods=["GET"])
def get_intelligence_session(session_id: str):
    """Retrieve full detail of a saved session."""
    identity_id = _safe_get_identity_id()

    s_path = _locate_session_file(session_id, identity_id)
    if not s_path.exists():
        raise AppError(ErrorCode.NOT_FOUND, "Session not found")

    with open(s_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    return json_ok({"session": data})


@intelligence_bp.route("/sessions/save", methods=["POST"])
def save_intelligence_session():
    """Save an Intelligence Hub session."""
    identity_id = _safe_get_identity_id()

    data = request.get_json() or {}
    session_id = data.get("id") or f"ih_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    s_path = _locate_session_file(session_id, identity_id)
    if not s_path.exists():
        s_dir = _get_sessions_dir(identity_id)
        s_path = s_dir / f"{session_id}.json"

    existing_data = {}
    if s_path.exists():
        try:
            with open(s_path, "r", encoding="utf-8") as fh:
                existing_data = json.load(fh)
        except Exception:
            existing_data = {}

    pinned = data.get("pinned")
    if pinned is None:
        pinned = existing_data.get("pinned", False)

    liked = data.get("liked")
    if liked is None:
        liked = existing_data.get("liked", False)

    payload = {
        "id": session_id,
        "title": data.get("title") or data.get("dashboard", {}).get("title") or existing_data.get("title") or "Intelligence Dashboard",
        "source_id": data.get("source_id") or existing_data.get("source_id"),
        "database": data.get("database") or existing_data.get("database"),
        "tables": data.get("tables", existing_data.get("tables", [])),
        "profile": data.get("profile", existing_data.get("profile")),
        "dashboard": data.get("dashboard", existing_data.get("dashboard")),
        "prompt": data.get("prompt", existing_data.get("prompt")),
        "chat_history": data.get("chat_history", existing_data.get("chat_history", [])),
        "pinned": bool(pinned),
        "liked": bool(liked),
        "created_at": data.get("created_at") or existing_data.get("created_at") or datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

    with open(s_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    return json_ok({"session": payload})


@intelligence_bp.route("/sessions/<session_id>/toggle-pin", methods=["POST"])
def toggle_session_pin(session_id: str):
    """Toggle or set pinned state of an Intelligence Hub session."""
    identity_id = _safe_get_identity_id()

    s_path = _locate_session_file(session_id, identity_id)
    body = request.get_json(silent=True) or {}

    if not s_path.exists():
        s_dir = _get_sessions_dir(identity_id)
        s_path = s_dir / f"{session_id}.json"
        data = {
            "id": session_id,
            "title": body.get("title", "Intelligence Dashboard"),
            "source_id": body.get("source_id"),
            "database": body.get("database"),
            "tables": body.get("tables", []),
            "profile": body.get("profile"),
            "dashboard": body.get("dashboard"),
            "prompt": body.get("prompt"),
            "chat_history": body.get("chat_history", []),
            "pinned": True if "pinned" not in body else bool(body["pinned"]),
            "liked": bool(body.get("liked", False)),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    else:
        with open(s_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if "pinned" in body:
            data["pinned"] = bool(body["pinned"])
        else:
            data["pinned"] = not bool(data.get("pinned", False))
        for key in ["title", "source_id", "database", "tables", "profile", "dashboard", "prompt", "chat_history"]:
            if key in body and body[key] is not None:
                data[key] = body[key]
        data["updated_at"] = datetime.now().isoformat()

    s_path.parent.mkdir(parents=True, exist_ok=True)
    with open(s_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    return json_ok({"session": data, "pinned": data["pinned"]})


@intelligence_bp.route("/sessions/<session_id>/toggle-like", methods=["POST"])
def toggle_session_like(session_id: str):
    """Toggle or set liked state of an Intelligence Hub session."""
    identity_id = _safe_get_identity_id()

    s_path = _locate_session_file(session_id, identity_id)
    body = request.get_json(silent=True) or {}

    if not s_path.exists():
        s_dir = _get_sessions_dir(identity_id)
        s_path = s_dir / f"{session_id}.json"
        data = {
            "id": session_id,
            "title": body.get("title", "Intelligence Dashboard"),
            "source_id": body.get("source_id"),
            "database": body.get("database"),
            "tables": body.get("tables", []),
            "profile": body.get("profile"),
            "dashboard": body.get("dashboard"),
            "prompt": body.get("prompt"),
            "chat_history": body.get("chat_history", []),
            "pinned": bool(body.get("pinned", False)),
            "liked": True if "liked" not in body else bool(body["liked"]),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    else:
        with open(s_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if "liked" in body:
            data["liked"] = bool(body["liked"])
        else:
            data["liked"] = not bool(data.get("liked", False))
        for key in ["title", "source_id", "database", "tables", "profile", "dashboard", "prompt", "chat_history"]:
            if key in body and body[key] is not None:
                data[key] = body[key]
        data["updated_at"] = datetime.now().isoformat()

    s_path.parent.mkdir(parents=True, exist_ok=True)
    with open(s_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    return json_ok({"session": data, "liked": data["liked"]})


@intelligence_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_intelligence_session(session_id: str):
    """Delete a saved session."""
    identity_id = _safe_get_identity_id()

    s_path = _locate_session_file(session_id, identity_id)
    if s_path.exists():
        try:
            s_path.unlink()
        except Exception as exc:
            logger.debug("Failed to unlink session file %s: %s", s_path, exc)

    return json_ok({"deleted": True, "id": session_id})

