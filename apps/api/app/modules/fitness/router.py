from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.modules.fitness.repository import WorkoutRepository
from app.modules.fitness.schemas import WorkoutCreate, WorkoutResponse


router = APIRouter(prefix="/api/workouts", tags=["fitness"])


def get_repository(request: Request) -> WorkoutRepository:
    return request.app.state.workout_repository


Repository = Annotated[WorkoutRepository, Depends(get_repository)]


@router.get("", response_model=list[WorkoutResponse])
def list_workouts(repository: Repository) -> list[dict[str, object]]:
    return repository.list()


@router.post("", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout: WorkoutCreate,
    repository: Repository,
) -> dict[str, object]:
    return repository.create(workout)

