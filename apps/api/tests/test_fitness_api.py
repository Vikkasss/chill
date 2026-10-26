from datetime import date

from fastapi.testclient import TestClient

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
        assert len(workout["exercises"]) == 2
        assert workout["exercises"][0]["sets"][1]["weight_kg"] == 45

        history = client.get("/api/workouts")
        assert history.status_code == 200
        assert [item["id"] for item in history.json()] == [workout["id"]]

