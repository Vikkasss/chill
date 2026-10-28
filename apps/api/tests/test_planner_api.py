from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.main import create_app


def test_task_lifecycle(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            json={
                "title": "  Подготовить план недели  ",
                "due_date": date.today().isoformat(),
                "priority": "high",
            },
        )

        assert created.status_code == 201
        task = created.json()
        assert task["title"] == "Подготовить план недели"
        assert task["completed"] is False
        assert task["base_priority"] == "high"

        listed = client.get("/api/tasks", params={"date": date.today().isoformat()})
        assert listed.status_code == 200
        assert [item["id"] for item in listed.json()] == [task["id"]]

        completed = client.patch(
            f"/api/tasks/{task['id']}/completion",
            json={"completed": True},
        )
        assert completed.status_code == 200
        assert completed.json()["completed"] is True

        edited = client.patch(
            f"/api/tasks/{task['id']}",
            json={"title": "Обновлённая задача", "priority": "low"},
        )
        assert edited.status_code == 200
        assert edited.json()["title"] == "Обновлённая задача"
        assert edited.json()["base_priority"] == "low"
        assert edited.json()["priority"] == "high"

        filtered = client.get("/api/tasks", params={"completed": True})
        assert filtered.status_code == 200
        assert [item["id"] for item in filtered.json()] == [task["id"]]

        deleted = client.delete(f"/api/tasks/{task['id']}")
        assert deleted.status_code == 204
        assert client.get("/api/tasks").json() == []


def test_missing_task_returns_404(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        response = client.patch(
            "/api/tasks/999/completion",
            json={"completed": True},
        )

    assert response.status_code == 404


def test_priority_increases_as_deadline_approaches(tmp_path) -> None:
    app = create_app(tmp_path / "test.db")
    today = date.today()

    with TestClient(app) as client:
        scenarios = [
            ("Далёкая", today + timedelta(days=10), "low", "low"),
            ("Скоро", today + timedelta(days=4), "low", "medium"),
            ("Срочно", today + timedelta(days=2), "low", "high"),
            ("Минимум средний", today + timedelta(days=10), "medium", "medium"),
            ("Высокий вручную", today + timedelta(days=30), "high", "high"),
        ]

        for title, deadline, base_priority, expected_priority in scenarios:
            response = client.post(
                "/api/tasks",
                json={
                    "title": title,
                    "due_date": deadline.isoformat(),
                    "priority": base_priority,
                },
            )
            assert response.status_code == 201
            assert response.json()["base_priority"] == base_priority
            assert response.json()["priority"] == expected_priority


def test_database_path_can_be_configured_with_environment(monkeypatch, tmp_path) -> None:
    database_path = tmp_path / "configured" / "personal_os.db"
    monkeypatch.setenv("PERSONAL_OS_DB_PATH", str(database_path))
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert database_path.exists()

