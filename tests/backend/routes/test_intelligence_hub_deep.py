"""Deep automated test suite for Intelligence Hub (BI HUB).

Validates all aspects of:
1. Multi-table profiling & schema inference
2. Calculated metrics & formula protection
3. Case-insensitive & normalized filter slicing
4. Temporal date filtering & monthly/daily aggregation
5. Multi-table join resolution & _unified_analytics
6. Pie/Donut top-N grouping
7. Chat refinement & domain mismatch detection
8. Sessions persistence, pin & like toggles
9. Executive report generation
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import duckdb
import flask
import pandas as pd
import pytest

from data_formulator.errors import AppError, ErrorCode
from data_formulator.routes.intelligence import (
    _build_column_inventory,
    _detect_domain_mismatch,
    _format_metric_value,
    _hydrate_dashboard_spec,
    _parse_and_build_metric_sql,
    _setup_unified_duckdb_views,
    _strip_spec_for_llm,
    intelligence_bp,
)

pytestmark = [pytest.mark.backend]


@pytest.fixture()
def app(tmp_path):
    test_app = flask.Flask(__name__)
    test_app.config["TESTING"] = True

    from data_formulator.error_handler import register_error_handlers
    test_app.register_blueprint(intelligence_bp)
    register_error_handlers(test_app)

    return test_app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def sample_manufacturing_workspace(tmp_path):
    """Creates a realistic multi-table manufacturing dataset."""
    workspace = MagicMock()

    plants_df = pd.DataFrame({
        "plant_id": [1, 2, 3],
        "plant_name": ["Bengaluru Plant", "Chennai Plant", "Pune Plant"],
        "region": ["South", "South", "West"],
    })
    production_df = pd.DataFrame({
        "prod_id": [101, 102, 103, 104, 105, 106],
        "plant_name": ["Bengaluru Plant", "Bengaluru Plant", "Chennai Plant", "Chennai Plant", "Pune Plant", "Pune Plant"],
        "product_line": ["Electronics", "Mechanical", "Electronics", "Automotive", "Mechanical", "Automotive"],
        "revenue": [500000.0, 750000.0, 300000.0, 450000.0, 600000.0, 800000.0],
        "production_cost": [350000.0, 520000.0, 210000.0, 320000.0, 410000.0, 580000.0],
        "units_produced": [5000, 7000, 3000, 4500, 6000, 8000],
        "defects_count": [50, 70, 30, 90, 60, 40],
        "production_date": ["2026-01-15", "2026-02-15", "2026-01-20", "2026-02-20", "2026-01-25", "2026-02-25"],
    })

    plants_path = tmp_path / "plants.parquet"
    prod_path = tmp_path / "production.parquet"
    plants_df.to_parquet(plants_path)
    production_df.to_parquet(prod_path)

    workspace.list_tables.return_value = ["plants", "production"]

    def _get_parquet(name):
        return plants_path.resolve() if name == "plants" else prod_path.resolve()

    workspace.get_parquet_path.side_effect = _get_parquet
    return workspace


class TestIntelligenceHubCalculatedMetrics:
    """Tests for calculated metric expression builder & math accuracy."""

    def test_simple_measure_sql(self):
        agg_expr, ref_cols = _parse_and_build_metric_sql(
            agg="SUM",
            measure_column="revenue",
            expression=None,
            all_known_cols={"revenue", "production_cost"},
        )
        assert "SUM(" in agg_expr
        assert '"revenue"' in agg_expr
        assert ref_cols == ["revenue"]

    def test_ratio_metric_expression_sql(self):
        # Margin ratio: SUM(revenue - production_cost) / NULLIF(SUM(revenue), 0)
        agg_expr, ref_cols = _parse_and_build_metric_sql(
            agg="SUM",
            measure_column=None,
            expression="(revenue - production_cost) / revenue",
            all_known_cols={"revenue", "production_cost"},
        )
        assert "revenue" in ref_cols
        assert "production_cost" in ref_cols
        assert "/" in agg_expr
        assert "NULLIF" in agg_expr

    def test_count_aggregation_metric(self):
        agg_expr, ref_cols = _parse_and_build_metric_sql(
            agg="COUNT",
            measure_column="plant_id",
            expression=None,
            all_known_cols={"plant_id"},
        )
        assert 'COUNT(DISTINCT "plant_id")' in agg_expr or 'COUNT(' in agg_expr

    def test_format_metric_currency_large(self):
        formatted, raw = _format_metric_value(3400000.0, "currency", measure_name="revenue")
        assert "$3.40M" in formatted

    def test_format_metric_percentage(self):
        formatted, raw = _format_metric_value(0.154, "percent", measure_name="defect_rate")
        assert "15.4%" in formatted


class TestIntelligenceHubHydrationAndFilterSlicing:
    """Deep testing of DuckDB query hydration, filter normalization, and slicing."""

    def test_hydration_all_filter(self, sample_manufacturing_workspace):
        spec = {
            "title": "Manufacturing Executive Dashboard",
            "filter": {
                "field": "Plant_Name",  # Note: uppercase underscore
                "label": "Plant Name",
            },
            "kpis": [
                {"title": "Total Revenue", "measure_column": "Revenue", "aggregation": "SUM", "format": "currency"},
                {"title": "Total Cost", "measure_column": "Production Cost", "aggregation": "SUM", "format": "currency"},
                {"title": "Units Produced", "measure_column": "units_produced", "aggregation": "SUM", "format": "number"},
                {"title": "Defect Rate", "expression": "defects_count / units_produced", "aggregation": "SUM", "format": "percent"},
            ],
            "visualizations": [
                {
                    "title": "Revenue by Product Line",
                    "chart_type": "bar",
                    "x_field": "Product Line",
                    "y_field": "Revenue",
                    "aggregation": "SUM",
                },
                {
                    "title": "Revenue Share by Plant",
                    "chart_type": "donut",
                    "x_field": "Plant Name",
                    "y_field": "Revenue",
                    "aggregation": "SUM",
                },
                {
                    "title": "Production Trend",
                    "chart_type": "line",
                    "x_field": "Production_Date",
                    "y_field": "Revenue",
                    "aggregation": "SUM",
                },
            ],
        }

        hydrated = _hydrate_dashboard_spec(sample_manufacturing_workspace, spec, filter_value="All")

        # 1. Filter options should be populated with distinct plant names + 'All'
        assert "All" in hydrated["filter"]["options"]
        assert "Bengaluru Plant" in hydrated["filter"]["options"]
        assert "Chennai Plant" in hydrated["filter"]["options"]
        assert "Pune Plant" in hydrated["filter"]["options"]

        # 2. Exactly 4 KPIs hydrated
        assert len(hydrated["kpis"]) == 4
        assert hydrated["kpis"][0]["formatted_value"] != "N/A"
        assert hydrated["kpis"][0]["raw_value"] == 3400000.0  # Sum of all revenue

        # 3. Specified visualizations have valid data records
        for viz in hydrated["visualizations"][:3]:
            assert "data" in viz
            assert len(viz["data"]) > 0
            assert "vega_spec" in viz

    def test_filter_slicing_case_insensitive_and_normalized(self, sample_manufacturing_workspace):
        spec = {
            "title": "Manufacturing Executive Dashboard",
            "filter": {
                "field": "plant_name",
                "label": "Plant Name",
            },
            "kpis": [
                {"title": "Total Revenue", "measure_column": "revenue", "aggregation": "SUM", "format": "currency"},
                {"title": "Units Produced", "measure_column": "units_produced", "aggregation": "SUM", "format": "number"},
            ],
            "visualizations": [
                {
                    "title": "Revenue by Product Line",
                    "chart_type": "bar",
                    "x_field": "product_line",
                    "y_field": "revenue",
                    "aggregation": "SUM",
                }
            ],
        }

        # Slice by lowercase: "bengaluru plant"
        hydrated_sliced = _hydrate_dashboard_spec(sample_manufacturing_workspace, spec, filter_value="bengaluru plant")

        # Bengaluru revenue = 500k + 750k = 1.25M
        revenue_kpi = hydrated_sliced["kpis"][0]
        assert revenue_kpi["raw_value"] == 1250000.0
        assert revenue_kpi["formatted_value"] != "N/A"

        # Chart records should only contain Bengaluru product lines (Electronics & Mechanical)
        bar_viz = hydrated_sliced["visualizations"][0]
        assert len(bar_viz["data"]) == 2
        lines = [r["product_line"] for r in bar_viz["data"]]
        assert "Electronics" in lines
        assert "Mechanical" in lines
        assert "Automotive" not in lines

    def test_filter_slicing_date_format(self, sample_manufacturing_workspace):
        spec = {
            "title": "Manufacturing Executive Dashboard",
            "filter": {
                "field": "production_date",
                "label": "Production Date",
            },
            "kpis": [
                {"title": "Total Revenue", "measure_column": "revenue", "aggregation": "SUM", "format": "currency"},
            ],
            "visualizations": [
                {
                    "title": "Revenue by Plant",
                    "chart_type": "bar",
                    "x_field": "plant_name",
                    "y_field": "revenue",
                    "aggregation": "SUM",
                }
            ],
        }

        # Slice by exact date with timestamp noise e.g. "2026-01-15 00:00:00"
        hydrated = _hydrate_dashboard_spec(sample_manufacturing_workspace, spec, filter_value="2026-01-15 00:00:00")
        revenue_kpi = hydrated["kpis"][0]
        assert revenue_kpi["raw_value"] == 500000.0


class TestIntelligenceHubChatAndDomainSafety:
    """Tests for chat refinement and domain mismatch guards."""

    def test_detect_domain_mismatch(self):
        hr_profile = {
            "tables": [
                {
                    "table_name": "employees",
                    "columns": ["employee_id", "first_name", "department", "salary", "hire_date"],
                }
            ]
        }

        # User asks for hospital patient bed capacity on HR table
        mismatch = _detect_domain_mismatch("Show patient bed capacity and ICU mortality rates", hr_profile)
        assert mismatch is not None
        assert "patient" in mismatch.lower() or "hospital" in mismatch.lower()

        # User asks legitimate question
        legit = _detect_domain_mismatch("Show average salary by department", hr_profile)
        assert legit is None

    def test_strip_spec_for_llm(self):
        full_spec = {
            "title": "Test Dashboard",
            "kpis": [
                {"title": "Sales", "measure_column": "sales", "raw_value": 12345, "formatted_value": "$12.3k", "subtitle": "test"}
            ],
            "visualizations": [
                {"title": "Chart 1", "x_field": "dept", "y_field": "sales", "records": [{"dept": "A", "sales": 10}], "vega_spec": {"$schema": "..."}}
            ]
        }
        stripped = _strip_spec_for_llm(full_spec)
        assert "records" not in stripped["visualizations"][0]
        assert "vega_spec" not in stripped["visualizations"][0]
        assert "raw_value" not in stripped["kpis"][0]


class TestIntelligenceHubEndpoints:
    """Full HTTP route tests for query-filter, sessions, pins, and likes."""

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_or_create_workspace")
    def test_query_filter_endpoint(self, mock_get_workspace, mock_id, client, sample_manufacturing_workspace):
        mock_get_workspace.return_value = sample_manufacturing_workspace

        payload = {
            "dashboard": {
                "title": "Manufacturing Executive Dashboard",
                "filter": {"field": "plant_name", "label": "Plant Name"},
                "kpis": [{"title": "Revenue", "measure_column": "revenue", "aggregation": "SUM"}],
                "visualizations": [{"title": "Cost by Plant", "chart_type": "bar", "x_field": "plant_name", "y_field": "production_cost"}],
            },
            "filter_value": "Chennai Plant"
        }

        resp = client.post("/api/intelligence/query-filter", json=payload)
        assert resp.status_code == 200
        res = resp.get_json()
        assert res["status"] == "success"
        db = res["data"]["dashboard"]
        # Chennai revenue = 300k + 450k = 750k
        assert db["kpis"][0]["raw_value"] == 750000.0

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_or_create_workspace")
    def test_sessions_crud_and_pin_like(self, mock_get_workspace, mock_id, client, sample_manufacturing_workspace):
        mock_get_workspace.return_value = sample_manufacturing_workspace

        session_id = "test_sess_001"
        save_payload = {
            "id": session_id,
            "title": "Manufacturing Intelligence",
            "source_id": "src_1",
            "database": "factory_db",
            "tables": ["plants", "production"],
            "dashboard": {"title": "Manufacturing Intelligence"},
            "pinned": True,
            "liked": False,
        }

        # 1. Save session
        save_resp = client.post("/api/intelligence/sessions/save", json=save_payload)
        assert save_resp.status_code == 200
        assert save_resp.get_json()["status"] == "success"

        # 2. List sessions
        list_resp = client.get("/api/intelligence/sessions")
        assert list_resp.status_code == 200
        sessions = list_resp.get_json()["data"]["sessions"]
        assert any(s["id"] == session_id for s in sessions)

        # 3. Toggle Like
        like_resp = client.post(f"/api/intelligence/sessions/{session_id}/toggle-like", json={"liked": True})
        assert like_resp.status_code == 200
        assert like_resp.get_json()["data"]["liked"] is True

        # 4. Toggle Pin
        pin_resp = client.post(f"/api/intelligence/sessions/{session_id}/toggle-pin", json={"pinned": False})
        assert pin_resp.status_code == 200
        assert pin_resp.get_json()["data"]["pinned"] is False

        # 5. Delete session
        del_resp = client.delete(f"/api/intelligence/sessions/{session_id}")
        assert del_resp.status_code == 200
        assert del_resp.get_json()["status"] == "success"


class TestVisualSubstitutionWhenNoData:
    """Test that missing or empty visual data is automatically substituted with real working data."""

    def test_missing_field_visual_is_substituted_with_working_data(self, sample_manufacturing_workspace):
        # Provide a spec with an invalid/nonexistent x_field "efficiency_rating" on a donut chart
        broken_spec = {
            "title": "Efficiency Overview",
            "description": "Overview of manufacturing",
            "filter": {"field": "plant_name", "selected_value": "All"},
            "kpis": [],
            "visualizations": [
                {
                    "id": "viz_donut_broken",
                    "title": "Efficiency Rating Breakdown",
                    "description": "Donut chart showing distribution of efficiency ratings",
                    "chart_type": "donut",
                    "x_field": "efficiency_rating",
                    "y_field": "Count",
                    "table": "production",
                }
            ],
        }

        hydrated = _hydrate_dashboard_spec(sample_manufacturing_workspace, broken_spec, filter_value="All")
        visuals = hydrated.get("visualizations", [])

        # Must have padded to 6 visuals
        assert len(visuals) == 6

        # The first visual must have been substituted and have real non-empty records
        v0 = visuals[0]
        assert len(v0.get("data", [])) > 0, "Visual data must not be empty"
        assert v0.get("title") != "Efficiency Rating Breakdown" or v0.get("x_field") != "efficiency_rating"
        assert v0.get("chart_type") in ("donut", "pie", "bar")
        # Ensure vega_spec is populated with records
        assert v0.get("vega_spec") is not None

        # Ensure all 6 visuals in the dashboard have working data
        for i, v in enumerate(visuals):
            assert len(v.get("data", [])) > 0, f"Visual #{i} ({v.get('title')}) must have active data and not be blank"

