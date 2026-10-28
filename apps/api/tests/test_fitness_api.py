from datetime import date
import sqlite3

from fastapi.testclient import TestClient

from app.database import Database
from app.main import create_app


def test_create_workout_and_read_history(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        created = client.post(
            "/api/workouts",
            json={
                "title": "Силовая тренировка",
                "performed_on": date.today().isoformat(),
                "notes": "Хорошее самочувствие",
                "creatine_taken": True,
                "exercises": [
                    {
                        "name": "Приседания",
                        "sets": [
                            {"weight_kg": 40, "reps": 10},
                            {"weight_kg": 45, "reps": 8},
                        ],
                    },
                    {
                        "name": "Планка",
                        "sets": [{"weight_kg": 0, "reps": 60}],
                    },
                ],
            },
        )

        assert created.status_code == 201
        workout = created.json()
        assert workout["title"] == "Силовая тренировка"
        assert workout["creatine_taken"] is True
        assert len(workout["exercises"]) == 2
        assert workout["exercises"][0]["sets"][1]["weight_kg"] == 45

        history = client.get("/api/workouts")
        assert history.status_code == 200
        assert [item["id"] for item in history.json()] == [workout["id"]]

        duplicate = client.post(
            "/api/workouts",
            json={
                "title": "Вторая тренировка",
                "performed_on": date.today().isoformat(),
            },
        )
        assert duplicate.status_code == 409

        updated = client.patch(
            f"/api/workouts/{workout['id']}",
            json={"title": "Силовая и растяжка", "creatine_taken": False},
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Силовая и растяжка"
        assert updated.json()["creatine_taken"] is False
        assert len(updated.json()["exercises"]) == 2

        deleted = client.delete(f"/api/workouts/{workout['id']}")
        assert deleted.status_code == 204
        assert client.get("/api/workouts").json() == []


def test_create_simple_calendar_workout_without_exercises(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        created = client.post(
            "/api/workouts",
            json={
                "title": "Мобильность и спина",
                "performed_on": date.today().isoformat(),
            },
        )

    assert created.status_code == 201
    assert created.json()["title"] == "Мобильность и спина"
    assert created.json()["creatine_taken"] is False
    assert created.json()["exercises"] == []


def test_existing_workout_table_gets_creatine_column(tmp_path) -> None:
    database_path = tmp_path / "existing.db"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE fitness_workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                performed_on TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT ''
            )
            """
        )
        connection.execute(
            """
            INSERT INTO fitness_workouts (title, performed_on)
            VALUES ('Старая тренировка', '2026-10-26')
            """
        )

    Database(database_path).initialize()

    with sqlite3.connect(database_path) as connection:
        columns = {
            row[1] for row in connection.execute("PRAGMA table_info(fitness_workouts)")
        }
        creatine_taken = connection.execute(
            "SELECT creatine_taken FROM fitness_workouts WHERE id = 1"
        ).fetchone()

    assert "creatine_taken" in columns
    assert creatine_taken == (0,)


def test_existing_duplicate_workout_dates_are_preserved(tmp_path) -> None:
    database_path = tmp_path / "duplicates.db"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE fitness_workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                performed_on TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                creatine_taken INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT ''
            )
            """
        )
        connection.executemany(
            """
            INSERT INTO fitness_workouts (title, performed_on)
            VALUES (?, '2026-10-26')
            """,
            [("Первая",), ("Вторая",)],
        )

    Database(database_path).initialize()

    with sqlite3.connect(database_path) as connection:
        count = connection.execute("SELECT COUNT(*) FROM fitness_workouts").fetchone()
        indexes = {
            row[1] for row in connection.execute("PRAGMA index_list(fitness_workouts)")
        }

    assert count == (2,)
    assert "idx_fitness_workouts_unique_date" not in indexes

