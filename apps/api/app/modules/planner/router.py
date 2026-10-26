from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.modules.planner.repository import TaskRepository
from app.modules.planner.schemas import (
    TaskCompletionUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)


router = APIRouter(prefix="/api/tasks", tags=["planner"])


def get_repository(request: Request) -> TaskRepository:
    return request.app.state.task_repository


Repository = Annotated[TaskRepository, Depends(get_repository)]


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    repository: Repository,
    due_date: Annotated[date | None, Query(alias="date")] = None,
    completed: bool | None = None,
) -> list[dict[str, object]]:
    return repository.list(due_date, completed)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, repository: Repository) -> dict[str, object]:
    return repository.create(task)


@router.patch("/{task_id}/completion", response_model=TaskResponse)
def update_completion(
    task_id: int,
    update: TaskCompletionUpdate,
    repository: Repository,
) -> dict[str, object]:
    task = repository.set_completed(task_id, update.completed)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    update: TaskUpdate,
    repository: Repository,
) -> dict[str, object]:
    task = repository.update(task_id, update)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, repository: Repository) -> Response:
    if not repository.delete(task_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

