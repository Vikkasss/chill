from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.modules.fitness.repository import WorkoutDateConflictError, WorkoutRepository
from app.modules.fitness.schemas import WorkoutCreate, WorkoutResponse, WorkoutUpdate


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
    try:
        return repository.create(workout)
    except WorkoutDateConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workout already exists for this date",
        ) from error


@router.patch("/{workout_id}", response_model=WorkoutResponse)
def update_workout(
    workout_id: int,
    update: WorkoutUpdate,
    repository: Repository,
) -> dict[str, object]:
    try:
        workout = repository.update(workout_id, update)
    except WorkoutDateConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workout already exists for this date",
        ) from error
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: int, repository: Repository) -> Response:
    if not repository.delete(workout_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

