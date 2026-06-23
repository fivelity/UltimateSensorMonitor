"""Dashboard preset business logic."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ..exceptions import PresetNotFoundError
from ..models import DashboardPreset
from ..repositories.base import JsonFileRepository
from ..schemas.responses import PresetListResponse, PresetSaveResponse
from .storage_service import StorageService


def _prepare_preset_data(preset: DashboardPreset, preset_id: str) -> dict[str, Any]:
    data = preset.model_dump(mode="json")
    data["id"] = preset_id
    data["updated_at"] = datetime.now().isoformat()
    if not data.get("created_at"):
        data["created_at"] = datetime.now().isoformat()
    return data


class PresetService(StorageService[DashboardPreset, PresetListResponse, PresetSaveResponse]):
    """Application service for dashboard presets."""

    def __init__(self, repository: JsonFileRepository):
        super().__init__(
            repository,
            PresetNotFoundError,
            lambda ids: PresetListResponse(presets=ids),
            lambda pid: PresetSaveResponse(message="Preset saved successfully", id=pid),
            _prepare_preset_data,
        )

    def list_presets(self) -> PresetListResponse:
        return self.list_items()

    def get_preset(self, preset_id: str) -> dict[str, Any]:
        return self.get_item(preset_id)

    def save_preset(self, preset: DashboardPreset) -> PresetSaveResponse:
        return self.save_item(preset)

    def delete_preset(self, preset_id: str) -> None:
        self.delete_item(preset_id)
