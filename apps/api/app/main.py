from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Database
from app.modules.fitness.repository import WorkoutRepository
from app.modules.fitness.router import router as fitness_router
from app.modules.nutrition.repository import NutritionRepository
from app.modules.nutrition.router import router as nutrition_router
from app.modules.planner.repository import TaskRepository
from app.modules.planner.router import router as planner_router


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "personal_os.db"


def create_app(database_path: Path | None = None) -> FastAPI:
    configured_path = Path(os.environ.get("PERSONAL_OS_DB_PATH", DEFAULT_DATABASE_PATH))
    database = Database(database_path or configured_path)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        database.initialize()
        app.state.task_repository = TaskRepository(database)
        app.state.workout_repository = WorkoutRepository(database)
        app.state.nutrition_repository = NutritionRepository(database)
        yield

    app = FastAPI(
        title="Personal OS API",
        version="0.4.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(planner_router)
    app.include_router(fitness_router)
    app.include_router(nutrition_router)
    return app


app = create_app()

