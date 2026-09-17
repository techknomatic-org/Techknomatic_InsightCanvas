# Copyright (c) Techknomatic Services Pvt Ltd.
# Licensed under the MIT License.

"""Identity-scoped persistence for user-configured AI models and selected model."""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
from pathlib import Path
from typing import Any

from flask import Blueprint, current_app, request

from data_formulator.auth.identity import get_identity_id
from data_formulator.datalake.workspace import get_user_home
from data_formulator.error_handler import json_ok
from data_formulator.errors import AppError, ErrorCode

logger = logging.getLogger(__name__)

user_models_bp = Blueprint("user_models", __name__, url_prefix="/api/user-models")

_FILENAME = "user_models.json"
_MAX_MODELS = 30
_MAX_FIELD_LENGTH = 4096
_lock = threading.Lock()


def _is_custom_models_disabled() -> bool:
    try:
        return bool(current_app.config.get("CLI_ARGS", {}).get("disable_custom_models", False))
    except Exception:
        return False


def _get_storage_path(identity_id: str) -> Path:
    return get_user_home(identity_id) / _FILENAME


def _sanitize_model_entry(val: Any) -> dict[str, Any]:
    if not isinstance(val, dict):
        raise AppError(ErrorCode.INVALID_REQUEST, "Model configuration must be an object")

    model_id = str(val.get("id") or "").strip()
    endpoint = str(val.get("endpoint") or "").strip()
    model_name = str(val.get("model") or "").strip()

    if not model_id or not endpoint or not model_name:
        raise AppError(ErrorCode.INVALID_REQUEST, "Model id, endpoint, and model name are required")

    sanitized: dict[str, Any] = {
        "id": model_id[:_MAX_FIELD_LENGTH],
        "endpoint": endpoint[:_MAX_FIELD_LENGTH],
        "model": model_name[:_MAX_FIELD_LENGTH],
    }

    if "api_key" in val and val["api_key"] is not None:
        sanitized["api_key"] = str(val["api_key"]).strip()[:_MAX_FIELD_LENGTH]
    if "api_base" in val and val["api_base"] is not None:
        sanitized["api_base"] = str(val["api_base"]).strip()[:_MAX_FIELD_LENGTH]
    if "api_version" in val and val["api_version"] is not None:
        sanitized["api_version"] = str(val["api_version"]).strip()[:_MAX_FIELD_LENGTH]
    if "auth_mode" in val and val["auth_mode"] is not None:
        sanitized["auth_mode"] = str(val["auth_mode"]).strip()[:_MAX_FIELD_LENGTH]

    sanitized["is_global"] = False
    return sanitized


def _read_user_models(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {"models": [], "selected_model_id": None}

    if not isinstance(data, dict):
        return {"models": [], "selected_model_id": None}

    raw_models = data.get("models") or []
    sanitized_models: list[dict[str, Any]] = []
    if isinstance(raw_models, list):
        for item in raw_models:
            try:
                sanitized_models.append(_sanitize_model_entry(item))
            except AppError:
                continue

    selected_id = data.get("selected_model_id")
    if selected_id is not None:
        selected_id = str(selected_id).strip() or None

    return {
        "models": sanitized_models[:_MAX_MODELS],
        "selected_model_id": selected_id,
    }


def _write_user_models(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(prefix=f".{_FILENAME}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_path, path)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


@user_models_bp.route("", methods=["GET"])
def get_user_models():
    """Retrieve saved models and active selection for the authenticated user."""
    if _is_custom_models_disabled():
        return json_ok({"models": [], "selected_model_id": None})

    identity = get_identity_id()
    path = _get_storage_path(identity)
    with _lock:
        data = _read_user_models(path)
    return json_ok(data)


@user_models_bp.route("", methods=["POST"])
def save_user_models():
    """Save or update custom models for the authenticated user."""
    if _is_custom_models_disabled():
        raise AppError(ErrorCode.ACCESS_DENIED, "Custom models are disabled on this server")

    if not request.is_json:
        raise AppError(ErrorCode.INVALID_REQUEST, "JSON request body required")

    payload = request.get_json() or {}
    identity = get_identity_id()
    path = _get_storage_path(identity)

    with _lock:
        current_data = _read_user_models(path)
        current_models = current_data.get("models", [])
        selected_id = current_data.get("selected_model_id")

        if "model" in payload:
            # Upsert single model
            new_model = _sanitize_model_entry(payload["model"])
            found = False
            for idx, m in enumerate(current_models):
                if m["id"] == new_model["id"]:
                    current_models[idx] = new_model
                    found = True
                    break
            if not found:
                current_models.append(new_model)
        elif "models" in payload:
            # Overwrite models array
            raw_models = payload["models"]
            if not isinstance(raw_models, list):
                raise AppError(ErrorCode.INVALID_REQUEST, "'models' must be a list")
            current_models = [_sanitize_model_entry(m) for m in raw_models][:_MAX_MODELS]

        if "selected_model_id" in payload:
            selected_id = str(payload["selected_model_id"]).strip() or None

        save_payload = {
            "models": current_models,
            "selected_model_id": selected_id,
        }
        _write_user_models(path, save_payload)

    return json_ok(save_payload)


@user_models_bp.route("/select", methods=["POST"])
def set_selected_user_model():
    """Persist active model selection for the current user."""
    if not request.is_json:
        raise AppError(ErrorCode.INVALID_REQUEST, "JSON request body required")

    payload = request.get_json() or {}
    selected_id = payload.get("selected_model_id")
    if selected_id is not None:
        selected_id = str(selected_id).strip() or None

    identity = get_identity_id()
    path = _get_storage_path(identity)

    with _lock:
        current_data = _read_user_models(path)
        current_data["selected_model_id"] = selected_id
        _write_user_models(path, current_data)

    return json_ok({"selected_model_id": selected_id})


@user_models_bp.route("/delete", methods=["POST"])
def delete_user_model():
    """Delete a custom model by id."""
    if _is_custom_models_disabled():
        raise AppError(ErrorCode.ACCESS_DENIED, "Custom models are disabled on this server")

    if not request.is_json:
        raise AppError(ErrorCode.INVALID_REQUEST, "JSON request body required")

    payload = request.get_json() or {}
    model_id = str(payload.get("id") or "").strip()
    if not model_id:
        raise AppError(ErrorCode.INVALID_REQUEST, "Model id is required")

    identity = get_identity_id()
    path = _get_storage_path(identity)

    with _lock:
        current_data = _read_user_models(path)
        current_models = [m for m in current_data.get("models", []) if m["id"] != model_id]
        selected_id = current_data.get("selected_model_id")
        if selected_id == model_id:
            selected_id = current_models[0]["id"] if current_models else None

        save_payload = {
            "models": current_models,
            "selected_model_id": selected_id,
        }
        _write_user_models(path, save_payload)

    return json_ok(save_payload)
