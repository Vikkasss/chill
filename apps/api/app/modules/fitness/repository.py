import sqlite3

from app.database import Database
from app.modules.fitness.schemas import WorkoutCreate


class WorkoutRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def list(self) -> list[dict[str, object]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                """
                SELECT id
                FROM fitness_workouts
                ORDER BY performed_on DESC, created_at DESC
                """
            ).fetchall()
            return [self._load(connection, row["id"]) for row in rows]

    def create(self, workout: WorkoutCreate) -> dict[str, object]:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO fitness_workouts (title, performed_on, notes)
                VALUES (?, ?, ?)
                """,
                (workout.title, workout.performed_on.isoformat(), workout.notes),
            )
            workout_id = cursor.lastrowid
            if workout_id is None:
                raise RuntimeError("Created workout does not have an id")

            for exercise_position, exercise in enumerate(workout.exercises, start=1):
                exercise_cursor = connection.execute(
                    """
                    INSERT INTO fitness_exercises (workout_id, name, position)
                    VALUES (?, ?, ?)
                    """,
                    (workout_id, exercise.name, exercise_position),
                )
                exercise_id = exercise_cursor.lastrowid
                if exercise_id is None:
                    raise RuntimeError("Created exercise does not have an id")
                connection.executemany(
                    """
                    INSERT INTO fitness_sets (exercise_id, set_number, weight_kg, reps)
                    VALUES (?, ?, ?, ?)
                    """,
                    [
                        (exercise_id, set_number, workout_set.weight_kg, workout_set.reps)
                        for set_number, workout_set in enumerate(exercise.sets, start=1)
                    ],
                )

            return self._load(connection, workout_id)

    @staticmethod
    def _load(connection: sqlite3.Connection, workout_id: int) -> dict[str, object]:
        workout = connection.execute(
            "SELECT * FROM fitness_workouts WHERE id = ?", (workout_id,)
        ).fetchone()
        if workout is None:
            raise RuntimeError("Workout could not be loaded")

        exercise_rows = connection.execute(
            """
            SELECT * FROM fitness_exercises
            WHERE workout_id = ?
            ORDER BY position ASC
            """,
            (workout_id,),
        ).fetchall()
        exercises: list[dict[str, object]] = []
        for exercise in exercise_rows:
            set_rows = connection.execute(
                """
                SELECT * FROM fitness_sets
                WHERE exercise_id = ?
                ORDER BY set_number ASC
                """,
                (exercise["id"],),
            ).fetchall()
            exercises.append(
                {
                    "id": exercise["id"],
                    "name": exercise["name"],
                    "position": exercise["position"],
                    "sets": [
                        {
                            "id": workout_set["id"],
                            "set_number": workout_set["set_number"],
                            "weight_kg": workout_set["weight_kg"],
                            "reps": workout_set["reps"],
                        }
                        for workout_set in set_rows
                    ],
                }
            )

        return {
            "id": workout["id"],
            "title": workout["title"],
            "performed_on": workout["performed_on"],
            "notes": workout["notes"],
            "created_at": workout["created_at"],
            "updated_at": workout["updated_at"],
            "exercises": exercises,
        }

