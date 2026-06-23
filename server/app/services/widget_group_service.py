"""Widget group business logic."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ..exceptions import WidgetGroupNotFoundError
from ..models import WidgetGroup
from ..repositories.base import JsonFileRepository
from ..schemas.responses import WidgetGroupListResponse, WidgetGroupSaveResponse
from .storage_service import StorageService


def _prepare_group_data(group: WidgetGroup, group_id: str) -> dict[str, Any]:
    data = group.model_dump(mode="json")
    data["id"] = group_id
    if not data.get("created_at"):
        data["created_at"] = datetime.now().isoformat()
    return data


class WidgetGroupService(StorageService[WidgetGroup, WidgetGroupListResponse, WidgetGroupSaveResponse]):
    """Application service for sharable widget groups."""

    def __init__(self, repository: JsonFileRepository):
        super().__init__(
            repository,
            WidgetGroupNotFoundError,
            lambda ids: WidgetGroupListResponse(groups=ids),
            lambda gid: WidgetGroupSaveResponse(message="Widget group saved successfully", id=gid),
            _prepare_group_data,
        )

    def list_groups(self) -> WidgetGroupListResponse:
        return self.list_items()

    def get_group(self, group_id: str) -> dict[str, Any]:
        return self.get_item(group_id)

    def save_group(self, group: WidgetGroup) -> WidgetGroupSaveResponse:
        return self.save_item(group)

    def delete_group(self, group_id: str) -> None:
        self.delete_item(group_id)
