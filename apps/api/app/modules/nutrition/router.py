from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.modules.nutrition.repository import NutritionRepository
from app.modules.nutrition.schemas import (
    NutritionDayResponse,
    NutritionEntryCreate,
    NutritionEntryResponse,
    NutritionEntryUpdate,
    NutritionGoals,
    NutritionGoalsUpdate,
)


router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


def get_repository(request: Request) -> NutritionRepository:
    return request.app.state.nutrition_repository


Repository = Annotated[NutritionRepository, Depends(get_repository)]


@router.get("/entries", response_model=list[NutritionEntryResponse])
def list_entries(repository: Repository) -> list[dict[str, object]]:
    return repository.list_entries()


@router.get("/day", response_model=NutritionDayResponse)
def get_day(
    repository: Repository,
    consumed_on: Annotated[date | None, Query(alias="date")] = None,
) -> dict[str, object]:
    return repository.get_day(consumed_on or date.today())


@router.post(
    "/entries",
    response_model=NutritionEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(
    entry: NutritionEntryCreate,
    repository: Repository,
) -> dict[str, object]:
    return repository.create_entry(entry)


@router.put("/entries/{entry_id}", response_model=NutritionEntryResponse)
def update_entry(
    entry_id: int,
    update: NutritionEntryUpdate,
    repository: Repository,
) -> dict[str, object]:
    entry = repository.update_entry(entry_id, update)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nutrition entry not found",
        )
    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, repository: Repository) -> Response:
    if not repository.delete_entry(entry_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nutrition entry not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/goals", response_model=NutritionGoals)
def update_goals(
    goals: NutritionGoalsUpdate,
    repository: Repository,
) -> dict[str, object]:
    return repository.update_goals(goals)
