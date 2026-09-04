"""Tests for Intelligence Hub routes (/api/intelligence/*).

Validates data profiling, suggestion generation, dashboard generation with
DuckDB query execution, instant filter slicing, and session persistence.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import flask
import pandas as pd
import pytest

from data_formulator.errors import AppError, ErrorCode

pytestmark = [pytest.mark.backend]


@pytest.fixture()
def app(tmp_path):
    test_app = flask.Flask(__name__)
    test_app.config["TESTING"] = True

    from data_formulator.error_handler import register_error_handlers
    from data_formulator.routes.intelligence import intelligence_bp
    test_app.register_blueprint(intelligence_bp)
    register_error_handlers(test_app)

    return test_app


@pytest.fixture()
def client(app):
    return app.test_client()


class TestIntelligenceHubRoutes:

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_or_create_workspace")
    def test_profile_data_success(self, mock_get_workspace, mock_id, client, tmp_path):
        # Create a mock parquet file and workspace
        workspace = MagicMock()
        mock_get_workspace.return_value = workspace

        # Create sample dataframe and write to parquet
        df = pd.DataFrame({
            "region": ["North", "South", "East", "West"],
            "sales": [100.5, 200.0, 150.2, 300.8],
            "units": [10, 20, 15, 30],
            "order_date": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04"]
        })
        pq_path = tmp_path / "sales.parquet"
        df.to_parquet(pq_path)

        workspace.list_tables.return_value = ["sales"]
        workspace.get_parquet_path.return_value = pq_path.resolve()

        resp = client.post(
            "/api/intelligence/profile",
            json={"tables": ["sales"]},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        profile = data["data"]["profile"]
        assert profile["table_count"] == 1
        assert len(profile["tables"]) == 1
        assert profile["tables"][0]["table_name"] == "sales"
        assert profile["tables"][0]["row_count"] == 4
        assert "sales" in profile["tables"][0]["measures"]
        assert "region" in profile["tables"][0]["dimensions"]

    @patch("data_formulator.routes.intelligence._get_client_from_request")
    def test_suggestions_generation(self, mock_get_client, client):
        mock_client = MagicMock()
        mock_client.model = "gpt-4o"
        mock_get_client.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "suggestions": [
                    {
                        "id": "sales_overview",
                        "title": "Sales Performance",
                        "description": "Executive overview of regional sales",
                        "prompt": "Create a sales performance dashboard",
                        "reason": "Sales measure and region dimension detected"
                    }
                ]
            })))
        ]
        mock_client.get_completion.return_value = mock_completion

        sample_profile = {
            "tables": [
                {
                    "table_name": "sales",
                    "row_count": 100,
                    "measures": ["sales"],
                    "dimensions": ["region"],
                    "columns": [{"name": "sales", "type": "FLOAT", "semantic_type": "numeric"}]
                }
            ]
        }

        resp = client.post(
            "/api/intelligence/suggestions",
            json={"profile": sample_profile},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        suggestions = data["data"]["suggestions"]
        assert len(suggestions) == 1
        assert suggestions[0]["title"] == "Sales Performance"

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_or_create_workspace")
    @patch("data_formulator.routes.intelligence._get_client_from_request")
    def test_generate_dashboard_structure(self, mock_get_client, mock_get_workspace, mock_id, client, tmp_path):
        workspace = MagicMock()
        mock_get_workspace.return_value = workspace

        df = pd.DataFrame({
            "region": ["North", "South", "East", "West"],
            "sales": [100.0, 200.0, 150.0, 300.0],
            "profit": [20.0, 50.0, 30.0, 80.0],
        })
        pq_path = tmp_path / "sales.parquet"
        df.to_parquet(pq_path)
        workspace.list_tables.return_value = ["sales"]
        workspace.get_parquet_path.return_value = pq_path.resolve()

        mock_client = MagicMock()
        mock_client.model = "gpt-4o"
        mock_get_client.return_value = mock_client

        mock_raw_spec = {
            "title": "Executive Sales Dashboard",
            "description": "Comprehensive sales and profit analysis",
            "filter": {"table": "sales", "field": "region", "label": "Region"},
            "kpis": [
                {"title": "Total Sales", "table": "sales", "measure_column": "sales", "aggregation": "SUM", "format": "currency"},
                {"title": "Total Profit", "table": "sales", "measure_column": "profit", "aggregation": "SUM", "format": "currency"},
                {"title": "Avg Sales", "table": "sales", "measure_column": "sales", "aggregation": "AVG", "format": "currency"},
                {"title": "Avg Profit", "table": "sales", "measure_column": "profit", "aggregation": "AVG", "format": "currency"},
            ],
            "visualizations": [
                {"title": "Sales by Region", "table": "sales", "chart_type": "bar", "x_field": "region", "y_field": "sales", "aggregation": "SUM"},
                {"title": "Profit by Region", "table": "sales", "chart_type": "bar", "x_field": "region", "y_field": "profit", "aggregation": "SUM"},
                {"title": "Sales Breakdown", "table": "sales", "chart_type": "donut", "x_field": "region", "y_field": "sales", "aggregation": "SUM"},
                {"title": "Profit Breakdown", "table": "sales", "chart_type": "donut", "x_field": "region", "y_field": "profit", "aggregation": "SUM"},
                {"title": "Sales Trend", "table": "sales", "chart_type": "line", "x_field": "region", "y_field": "sales", "aggregation": "SUM"},
                {"title": "Profit Trend", "table": "sales", "chart_type": "area", "x_field": "region", "y_field": "profit", "aggregation": "SUM"},
            ]
        }
        mock_client.get_completion.return_value = MagicMock(choices=[
            MagicMock(message=MagicMock(content=json.dumps(mock_raw_spec)))
        ])

        sample_profile = {
            "tables": [{"table_name": "sales", "row_count": 4, "columns": []}]
        }

        resp = client.post(
            "/api/intelligence/generate-dashboard",
            json={"profile": sample_profile, "prompt": "Create an executive dashboard"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        dashboard = data["data"]["dashboard"]

        # Verify fixed 1 filter + 4 KPIs + 6 Visualizations
        assert dashboard["title"] == "Executive Sales Dashboard"
        assert dashboard["filter"]["field"] == "region"
        assert len(dashboard["kpis"]) == 4
        assert len(dashboard["visualizations"]) == 6
        # Verify KPIs were computed with real data
        assert dashboard["kpis"][0]["formatted_value"] == "$750.00"
        assert dashboard["kpis"][1]["formatted_value"] == "$180.00"

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_or_create_workspace")
    def test_query_filter_slicing(self, mock_get_workspace, mock_id, client, tmp_path):
        workspace = MagicMock()
        mock_get_workspace.return_value = workspace

        df = pd.DataFrame({
            "region": ["North", "North", "South", "East"],
            "sales": [100.0, 200.0, 150.0, 300.0],
            "profit": [20.0, 50.0, 30.0, 80.0],
        })
        pq_path = tmp_path / "sales.parquet"
        df.to_parquet(pq_path)
        workspace.list_tables.return_value = ["sales"]
        workspace.get_parquet_path.return_value = pq_path.resolve()

        dashboard_spec = {
            "title": "Sales Dashboard",
            "filter": {"table": "sales", "field": "region", "label": "Region", "selected_value": "All"},
            "kpis": [
                {"title": "Total Sales", "table": "sales", "measure_column": "sales", "aggregation": "SUM", "format": "currency"},
                {"title": "Total Profit", "table": "sales", "measure_column": "profit", "aggregation": "SUM", "format": "currency"},
            ],
            "visualizations": [
                {"title": "Sales by Region", "table": "sales", "chart_type": "bar", "x_field": "region", "y_field": "sales", "aggregation": "SUM"},
            ]
        }

        # Filter by region = 'North'
        resp = client.post(
            "/api/intelligence/query-filter",
            json={"dashboard": dashboard_spec, "filter_value": "North"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        sliced = data["data"]["dashboard"]
        # Total sales for North should be 100 + 200 = 300
        assert sliced["kpis"][0]["formatted_value"] == "$300.00"
        assert sliced["filter"]["selected_value"] == "North"

    @patch("data_formulator.routes.intelligence.get_identity_id", return_value="test_user")
    @patch("data_formulator.routes.intelligence._get_sessions_dir")
    def test_session_persistence(self, mock_sessions_dir, mock_id, client, tmp_path):
        mock_sessions_dir.return_value = tmp_path

        # Save session
        save_payload = {
            "title": "My Executive Dashboard",
            "source_id": "mysql_main",
            "database": "sales_db",
            "tables": ["orders", "customers"],
            "prompt": "Create an executive dashboard",
            "dashboard": {"title": "My Executive Dashboard", "kpis": [], "visualizations": []},
        }
        resp = client.post("/api/intelligence/sessions/save", json=save_payload)
        assert resp.status_code == 200
        sess_data = resp.get_json()["data"]["session"]
        sess_id = sess_data["id"]

        # List sessions
        list_resp = client.get("/api/intelligence/sessions")
        assert list_resp.status_code == 200
        sessions = list_resp.get_json()["data"]["sessions"]
        # Toggle pin
        pin_resp = client.post(f"/api/intelligence/sessions/{sess_id}/toggle-pin")
        assert pin_resp.status_code == 200
        assert pin_resp.get_json()["data"]["pinned"] is True

        # Toggle like
        like_resp = client.post(f"/api/intelligence/sessions/{sess_id}/toggle-like")
        assert like_resp.status_code == 200
        assert like_resp.get_json()["data"]["liked"] is True

        # Check list retains pinned & liked flags
        list_resp2 = client.get("/api/intelligence/sessions")
        assert list_resp2.status_code == 200
        sessions2 = list_resp2.get_json()["data"]["sessions"]
        assert sessions2[0]["pinned"] is True
        assert sessions2[0]["liked"] is True

        # Delete session
        del_resp = client.delete(f"/api/intelligence/sessions/{sess_id}")
        assert del_resp.status_code == 200
        assert del_resp.get_json()["data"]["deleted"] is True
