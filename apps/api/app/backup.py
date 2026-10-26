import os
from pathlib import Path
import shutil
import sqlite3
import sys
import tempfile

from app.main import DEFAULT_DATABASE_PATH


def create_backup(source_path: Path, destination_path: Path) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source_path) as source:
        with sqlite3.connect(destination_path) as destination:
            source.backup(destination)


def main() -> None:
    source_path = Path(os.environ.get("PERSONAL_OS_DB_PATH", DEFAULT_DATABASE_PATH))
    with tempfile.TemporaryDirectory() as temporary_directory:
        backup_path = Path(temporary_directory) / "personal_os.db"
        create_backup(source_path, backup_path)
        with backup_path.open("rb") as backup_file:
            shutil.copyfileobj(backup_file, sys.stdout.buffer)


if __name__ == "__main__":
    main()

