import sqlite3

from app.database import Database
from app.modules.fitness.schemas import WorkoutCreate, WorkoutUpdate


class WorkoutDateConflictError(Exception):
    pass


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
            performed_on = workout.performed_on.isoformat()
            if self._date_is_taken(connection, performed_on):
                raise WorkoutDateConflictError
            try:
                cursor = connection.execute(
                    """
                    INSERT INTO fitness_workouts (title, performed_on, notes, creatine_taken)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        workout.title,
                        performed_on,
                        workout.notes,
                        int(workout.creatine_taken),
                    ),
                )
            except sqlite3.IntegrityError as error:
                raise WorkoutDateConflictError from error
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

    def update(
        self,
        workout_id: int,
        update: WorkoutUpdate,
    ) -> dict[str, object] | None:
        with self.database.connect() as connection:
            existing = connection.execute(
                "SELECT * FROM fitness_workouts WHERE id = ?", (workout_id,)
            ).fetchone()
            if existing is None:
                return None

            performed_on = (
                update.performed_on.isoformat()
                if update.performed_on is not None
                else existing["performed_on"]
            )
            if self._date_is_taken(connection, performed_on, excluding_id=workout_id):
                raise WorkoutDateConflictError

            try:
                connection.execute(
                    """
                    UPDATE fitness_workouts
                    SET title = ?, performed_on = ?, notes = ?, creatine_taken = ?,
                        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    WHERE id = ?
                    """,
                    (
                        update.title if update.title is not None else existing["title"],
                        performed_on,
                        update.notes if update.notes is not None else existing["notes"],
                        int(update.creatine_taken)
                        if update.creatine_taken is not None
                        else existing["creatine_taken"],
                        workout_id,
                    ),
                )
            except sqlite3.IntegrityError as error:
                raise WorkoutDateConflictError from error
            return self._load(connection, workout_id)

    def delete(self, workout_id: int) -> bool:
        with self.database.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM fitness_workouts WHERE id = ?", (workout_id,)
            )
        return cursor.rowcount > 0

    @staticmethod
    def _date_is_taken(
        connection: sqlite3.Connection,
        performed_on: str,
        excluding_id: int | None = None,
    ) -> bool:
        if excluding_id is None:
            row = connection.execute(
                "SELECT 1 FROM fitness_workouts WHERE performed_on = ? LIMIT 1",
                (performed_on,),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT 1 FROM fitness_workouts
                WHERE performed_on = ? AND id != ?
                LIMIT 1
                """,
                (performed_on, excluding_id),
            ).fetchone()
        return row is not None

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
            "creatine_taken": bool(workout["creatine_taken"]),
            "created_at": workout["created_at"],
            "updated_at": workout["updated_at"],
            "exercises": exercises,
        }

