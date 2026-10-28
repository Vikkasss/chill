from datetime import date

from app.database import Database
from app.modules.nutrition.schemas import (
    NutritionEntryCreate,
    NutritionEntryUpdate,
    NutritionGoalsUpdate,
)


class NutritionRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def list_entries(self) -> list[dict[str, object]]:
        with self.database.connect() as connection:
            entries = connection.execute(
                """
                SELECT * FROM nutrition_entries
                ORDER BY consumed_on DESC, created_at DESC, id DESC
                """
            ).fetchall()
        return [
            {
                "id": entry["id"],
                "consumed_on": entry["consumed_on"],
                "protein_g": entry["protein_g"],
                "calories": entry["calories"],
                "created_at": entry["created_at"],
            }
            for entry in entries
        ]

    def get_day(self, consumed_on: date) -> dict[str, object]:
        with self.database.connect() as connection:
            goals = connection.execute(
                "SELECT protein_goal, calorie_goal FROM nutrition_settings WHERE id = 1"
            ).fetchone()
            entries = connection.execute(
                """
                SELECT * FROM nutrition_entries
                WHERE consumed_on = ?
                ORDER BY created_at DESC, id DESC
                """,
                (consumed_on.isoformat(),),
            ).fetchall()

        if goals is None:
            raise RuntimeError("Nutrition goals are not initialized")

        serialized_entries = [
            {
                "id": entry["id"],
                "consumed_on": entry["consumed_on"],
                "protein_g": entry["protein_g"],
                "calories": entry["calories"],
                "created_at": entry["created_at"],
            }
            for entry in entries
        ]
        return {
            "date": consumed_on.isoformat(),
            "goals": {
                "protein_goal": goals["protein_goal"],
                "calorie_goal": goals["calorie_goal"],
            },
            "totals": {
                "protein_g": sum(float(entry["protein_g"]) for entry in entries),
                "calories": sum(int(entry["calories"]) for entry in entries),
            },
            "entries": serialized_entries,
        }

    def create_entry(self, entry: NutritionEntryCreate) -> dict[str, object]:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO nutrition_entries (consumed_on, protein_g, calories)
                VALUES (?, ?, ?)
                """,
                (entry.consumed_on.isoformat(), entry.protein_g, entry.calories),
            )
            row = connection.execute(
                "SELECT * FROM nutrition_entries WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        if row is None:
            raise RuntimeError("Created nutrition entry could not be loaded")
        return {
            "id": row["id"],
            "consumed_on": row["consumed_on"],
            "protein_g": row["protein_g"],
            "calories": row["calories"],
            "created_at": row["created_at"],
        }

    def delete_entry(self, entry_id: int) -> bool:
        with self.database.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM nutrition_entries WHERE id = ?", (entry_id,)
            )
        return cursor.rowcount > 0

    def update_entry(
        self,
        entry_id: int,
        update: NutritionEntryUpdate,
    ) -> dict[str, object] | None:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                UPDATE nutrition_entries
                SET protein_g = ?, calories = ?
                WHERE id = ?
                """,
                (update.protein_g, update.calories, entry_id),
            )
            if cursor.rowcount == 0:
                return None
            row = connection.execute(
                "SELECT * FROM nutrition_entries WHERE id = ?", (entry_id,)
            ).fetchone()
        if row is None:
            raise RuntimeError("Updated nutrition entry could not be loaded")
        return {
            "id": row["id"],
            "consumed_on": row["consumed_on"],
            "protein_g": row["protein_g"],
            "calories": row["calories"],
            "created_at": row["created_at"],
        }

    def update_goals(self, goals: NutritionGoalsUpdate) -> dict[str, object]:
        with self.database.connect() as connection:
            connection.execute(
                """
                UPDATE nutrition_settings
                SET protein_goal = ?, calorie_goal = ?,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE id = 1
                """,
                (goals.protein_goal, goals.calorie_goal),
            )
        return {
            "protein_goal": goals.protein_goal,
            "calorie_goal": goals.calorie_goal,
        }
