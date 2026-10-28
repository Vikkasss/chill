export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: number;
  title: string;
  due_date: string;
  priority: TaskPriority;
  base_priority: TaskPriority;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskDraft = Pick<Task, "title" | "due_date" | "priority">;

export type TaskUpdate = Partial<TaskDraft>;

export type TaskCompletionFilter = "all" | "active" | "completed";

export type WorkoutSetDraft = {
  weight_kg: number;
  reps: number;
};

export type WorkoutExerciseDraft = {
  name: string;
  sets: WorkoutSetDraft[];
};

export type WorkoutDraft = {
  title: string;
  performed_on: string;
  creatine_taken: boolean;
  notes?: string;
  exercises?: WorkoutExerciseDraft[];
};

export type WorkoutUpdate = Partial<
  Pick<WorkoutDraft, "title" | "performed_on" | "notes" | "creatine_taken">
>;

export type WorkoutSet = WorkoutSetDraft & {
  id: number;
  set_number: number;
};

export type WorkoutExercise = {
  id: number;
  name: string;
  position: number;
  sets: WorkoutSet[];
};

export type Workout = {
  id: number;
  title: string;
  performed_on: string;
  notes: string;
  creatine_taken: boolean;
  created_at: string;
  updated_at: string;
  exercises: WorkoutExercise[];
};

export type NutritionGoals = {
  protein_goal: number;
  calorie_goal: number;
};

export type NutritionEntry = {
  id: number;
  consumed_on: string;
  protein_g: number;
  calories: number;
  created_at: string;
};

export type NutritionEntryDraft = Omit<NutritionEntry, "id" | "created_at">;

export type NutritionEntryUpdate = Pick<NutritionEntry, "protein_g" | "calories">;

export type NutritionDay = {
  date: string;
  goals: NutritionGoals;
  totals: {
    protein_g: number;
    calories: number;
  };
  entries: NutritionEntry[];
};

