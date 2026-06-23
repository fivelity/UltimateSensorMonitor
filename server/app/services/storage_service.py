"""Generic storage service for file-backed JSON entities."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from ..exceptions import AppError
from ..repositories.base import JsonFileRepository

TModel = TypeVar("TModel", bound=BaseModel)
TListResponse = TypeVar("TListResponse", bound=BaseModel)
TSaveResponse = TypeVar("TSaveResponse", bound=BaseModel)


class StorageService(Generic[TModel, TListResponse, TSaveResponse]):
    """Generic application service for file-backed JSON entities.

    Subclasses or instances provide small lambdas/builders for response models
    and optional data preparation.
    """

    def __init__(
        self,
        repository: JsonFileRepository,
        not_found_error: type[AppError],
        list_response_builder: Callable[[list[str]], TListResponse],
        save_response_builder: Callable[[str], TSaveResponse],
        data_preparer: Callable[[TModel, str], dict[str, Any]] | None = None,
    ):
        self._repository = repository
        self._not_found_error = not_found_error
        self._list_response_builder = list_response_builder
        self._save_response_builder = save_response_builder
        self._data_preparer = data_preparer

    def list_items(self) -> TListResponse:
        return self._list_response_builder(self._repository.list_ids())

    def get_item(self, item_id: str) -> dict[str, Any]:
        data = self._repository.get(item_id)
        if data is None:
            raise self._not_found_error(item_id)
        return data

    def save_item(self, item: TModel) -> TSaveResponse:
        item_id = item.id or str(uuid.uuid4())
        data = self._data_preparer(item, item_id) if self._data_preparer else item.model_dump(mode="json")
        self._repository.save(item_id, data)
        return self._save_response_builder(item_id)

    def delete_item(self, item_id: str) -> None:
        self._repository.delete(item_id)

