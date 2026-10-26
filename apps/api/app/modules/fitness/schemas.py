from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class WorkoutSetCreate(BaseModel):
    weight_kg: float = Field(default=0, ge=0, le=1000)
    reps: int = Field(ge=1, le=1000)


class WorkoutExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sets: list[WorkoutSetCreate] = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Exercise name cannot be empty")
        return name


class WorkoutCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    performed_on: date = Field(default_factory=date.today)
    notes: str = Field(default="", max_length=2000)
    exercises: list[WorkoutExerciseCreate] = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Workout title cannot be empty")
        return title

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str) -> str:
        return value.strip()


class WorkoutSetResponse(BaseModel):
    id: int
    set_number: int
    weight_kg: float
    reps: int


class WorkoutExerciseResponse(BaseModel):
    id: int
    name: str
    position: int
    sets: list[WorkoutSetResponse]


class WorkoutResponse(BaseModel):
    id: int
    title: str
    performed_on: date
    notes: str
    created_at: datetime
    updated_at: datetime
    exercises: list[WorkoutExerciseResponse]

