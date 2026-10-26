import sqlite3

from app.backup import create_backup
from app.database import Database


def test_backup_contains_current_data(tmp_path) -> None:
    source_path = tmp_path / "source.db"
    backup_path = tmp_path / "backup.db"
    database = Database(source_path)
    database.initialize()

    with database.connect() as connection:
        connection.execute(
            """
            INSERT INTO planner_tasks (title, due_date, priority)
            VALUES ('Сохранить меня', '2026-10-26', 'high')
            """
        )

    create_backup(source_path, backup_path)

    with sqlite3.connect(backup_path) as connection:
        title = connection.execute("SELECT title FROM planner_tasks").fetchone()[0]
    assert title == "Сохранить меня"
