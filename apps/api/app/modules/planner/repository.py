from datetime import date, datetime
import os
from sqlite3 import Row
from zoneinfo import ZoneInfo

from app.database import Database
from app.modules.planner.schemas import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def list(
        self,
        due_date: date | None = None,
        completed: bool | None = None,
    ) -> list[dict[str, object]]:
        query = "SELECT * FROM planner_tasks"
        conditions: list[str] = []
        parameters: list[object] = []
        if due_date is not None:
            conditions.append("due_date = ?")
            parameters.append(due_date.isoformat())
        if completed is not None:
            conditions.append("completed = ?")
            parameters.append(completed)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC"

        with self.database.connect() as connection:
            rows = connection.execute(query, parameters).fetchall()
        tasks = [self._serialize(row) for row in rows]
        priority_order = {"high": 0, "medium": 1, "low": 2}
        tasks.sort(
            key=lambda task: (
                task["completed"],
                priority_order[str(task["priority"])],
                task["due_date"],
            )
        )
        return tasks

    def create(self, task: TaskCreate) -> dict[str, object]:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO planner_tasks (title, due_date, priority)
                VALUES (?, ?, ?)
                """,
                (task.title, task.due_date.isoformat(), task.priority),
            )
            row = connection.execute(
                "SELECT * FROM planner_tasks WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        if row is None:
            raise RuntimeError("Created task could not be loaded")
        return self._serialize(row)

    def set_completed(self, task_id: int, completed: bool) -> dict[str, object] | None:
        with self.database.connect() as connection:
            connection.execute(
                """
                UPDATE planner_tasks
                SET completed = ?,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE id = ?
                """,
                (completed, task_id),
            )
            row = connection.execute(
                "SELECT * FROM planner_tasks WHERE id = ?", (task_id,)
            ).fetchone()
        return self._serialize(row) if row is not None else None

    def update(self, task_id: int, task: TaskUpdate) -> dict[str, object] | None:
        changes = task.model_dump(exclude_unset=True, exclude_none=True)
        assignments: list[str] = []
        parameters: list[object] = []
        for field, value in changes.items():
            assignments.append(f"{field} = ?")
            parameters.append(value.isoformat() if isinstance(value, date) else value)
        assignments.append("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
        parameters.append(task_id)

        with self.database.connect() as connection:
            cursor = connection.execute(
                f"UPDATE planner_tasks SET {', '.join(assignments)} WHERE id = ?",
                parameters,
            )
            if cursor.rowcount == 0:
                return None
            row = connection.execute(
                "SELECT * FROM planner_tasks WHERE id = ?", (task_id,)
            ).fetchone()
        return self._serialize(row) if row is not None else None

    def delete(self, task_id: int) -> bool:
        with self.database.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM planner_tasks WHERE id = ?", (task_id,)
            )
        return cursor.rowcount > 0

    @staticmethod
    def _serialize(row: Row) -> dict[str, object]:
        base_priority = str(row["priority"])
        due_date = date.fromisoformat(str(row["due_date"]))
        return {
            "id": row["id"],
            "title": row["title"],
            "due_date": due_date.isoformat(),
            "priority": TaskRepository._effective_priority(base_priority, due_date),
            "base_priority": base_priority,
            "completed": bool(row["completed"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    @staticmethod
    def _effective_priority(base_priority: str, due_date: date) -> str:
        timezone = ZoneInfo(os.environ.get("PERSONAL_OS_TIMEZONE", "Europe/Moscow"))
        days_left = (due_date - datetime.now(timezone).date()).days
        if days_left <= 2:
            deadline_priority = "high"
        elif days_left <= 5:
            deadline_priority = "medium"
        else:
            deadline_priority = "low"

        priority_rank = {"low": 0, "medium": 1, "high": 2}
        return max((base_priority, deadline_priority), key=priority_rank.__getitem__)

