from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class NutritionGoals(BaseModel):
    protein_goal: float
    calorie_goal: int


class NutritionGoalsUpdate(BaseModel):
    protein_goal: float = Field(gt=0, le=1000)
    calorie_goal: int = Field(gt=0, le=10000)


class NutritionEntryCreate(BaseModel):
    consumed_on: date = Field(default_factory=date.today)
    protein_g: float = Field(default=0, ge=0, le=1000)
    calories: int = Field(default=0, ge=0, le=10000)

    @model_validator(mode="after")
    def require_nutrition_value(self) -> "NutritionEntryCreate":
        if self.protein_g == 0 and self.calories == 0:
            raise ValueError("Protein or calories must be greater than zero")
        return self


class NutritionEntryUpdate(BaseModel):
    protein_g: float = Field(ge=0, le=1000)
    calories: int = Field(ge=0, le=10000)

    @model_validator(mode="after")
    def require_nutrition_value(self) -> "NutritionEntryUpdate":
        if self.protein_g == 0 and self.calories == 0:
            raise ValueError("Protein or calories must be greater than zero")
        return self


class NutritionEntryResponse(BaseModel):
    id: int
    consumed_on: date
    protein_g: float
    calories: int
    created_at: datetime


class NutritionTotals(BaseModel):
    protein_g: float
    calories: int


class NutritionDayResponse(BaseModel):
    date: date
    goals: NutritionGoals
    totals: NutritionTotals
    entries: list[NutritionEntryResponse]
