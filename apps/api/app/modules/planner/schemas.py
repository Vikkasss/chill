from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


TaskPriority = Literal["low", "medium", "high"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    due_date: date = Field(default_factory=date.today)
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Task title cannot be empty")
        return title


class TaskCompletionUpdate(BaseModel):
    completed: bool


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    due_date: date | None = None
    priority: TaskPriority | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        title = value.strip()
        if not title:
            raise ValueError("Task title cannot be empty")
        return title

    @model_validator(mode="after")
    def require_change(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one task field must be provided")
        return self


class TaskResponse(BaseModel):
    id: int
    title: str
    due_date: date
    priority: TaskPriority
    completed: bool
    created_at: datetime
    updated_at: datetime

