"""Base file-backed repository for JSON persistence."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=dict)


class JsonFileRepository(Generic[T]):
    """In-memory repository with JSON file persistence.

    Loads all existing files on startup and writes every save to disk.
    """

    def __init__(self, directory: str | Path, prefix: str):
        self.directory = Path(directory)
        self.prefix = prefix
        self._storage: dict[str, T] = {}

        self.directory.mkdir(parents=True, exist_ok=True)
        self._load_all()

    def _file_path(self, item_id: str) -> Path:
        return self.directory / f"{self.prefix}_{item_id}.json"

    def _load_all(self) -> None:
        for file_path in self.directory.glob(f"{self.prefix}_*.json"):
            item_id = file_path.stem.replace(f"{self.prefix}_", "")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    self._storage[item_id] = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Failed to load {file_path}: {e}")

    def list_ids(self) -> list[str]:
        return list(self._storage.keys())

    def get(self, item_id: str) -> T | None:
        if item_id in self._storage:
            return self._storage[item_id]

        file_path = self._file_path(item_id)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._storage[item_id] = data
                return data
        except FileNotFoundError:
            return None
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"Failed to load {file_path}: {e}")
            return None

    def save(self, item_id: str, data: T) -> None:
        self._storage[item_id] = data
        file_path = self._file_path(item_id)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
        except OSError as e:
            logger.error(f"Failed to write {file_path}: {e}")
            raise

    def delete(self, item_id: str) -> bool:
        removed = self._storage.pop(item_id, None) is not None
        file_path = self._file_path(item_id)
        try:
            os.remove(file_path)
            return True
        except FileNotFoundError:
            return removed
        except OSError as e:
            logger.error(f"Failed to delete {file_path}: {e}")
            return False
