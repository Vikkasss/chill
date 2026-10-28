from datetime import date

from fastapi.testclient import TestClient

from app.main import create_app


def test_nutrition_day_uses_defaults_and_tracks_entries(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")
    today = date.today().isoformat()

    with TestClient(app) as client:
        empty_day = client.get("/api/nutrition/day", params={"date": today})
        assert empty_day.status_code == 200
        assert empty_day.json()["goals"] == {
            "protein_goal": 95.0,
            "calorie_goal": 1850,
        }

        first = client.post(
            "/api/nutrition/entries",
            json={"consumed_on": today, "protein_g": 24.5, "calories": 410},
        )
        second = client.post(
            "/api/nutrition/entries",
            json={"consumed_on": today, "protein_g": 10, "calories": 180},
        )
        assert first.status_code == 201
        assert second.status_code == 201

        history = client.get("/api/nutrition/entries")
        assert history.status_code == 200
        assert [entry["id"] for entry in history.json()] == [
            second.json()["id"],
            first.json()["id"],
        ]

        day = client.get("/api/nutrition/day", params={"date": today}).json()
        assert day["totals"] == {"protein_g": 34.5, "calories": 590}
        assert len(day["entries"]) == 2

        edited = client.put(
            f"/api/nutrition/entries/{first.json()['id']}",
            json={"protein_g": 30, "calories": 500},
        )
        assert edited.status_code == 200
        assert edited.json()["protein_g"] == 30.0
        assert edited.json()["calories"] == 500

        edited_day = client.get("/api/nutrition/day", params={"date": today}).json()
        assert edited_day["totals"] == {"protein_g": 40.0, "calories": 680}

        deleted = client.delete(f"/api/nutrition/entries/{first.json()['id']}")
        assert deleted.status_code == 204

        updated = client.put(
            "/api/nutrition/goals",
            json={"protein_goal": 110, "calorie_goal": 2100},
        )
        assert updated.status_code == 200
        assert updated.json() == {"protein_goal": 110.0, "calorie_goal": 2100}

        refreshed = client.get("/api/nutrition/day", params={"date": today}).json()
        assert refreshed["totals"] == {"protein_g": 10.0, "calories": 180}
        assert refreshed["goals"] == {"protein_goal": 110.0, "calorie_goal": 2100}


def test_nutrition_entry_requires_a_value(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        response = client.post(
            "/api/nutrition/entries",
            json={"protein_g": 0, "calories": 0},
        )

    assert response.status_code == 422
