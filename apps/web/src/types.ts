export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: number;
  title: string;
  due_date: string;
  priority: TaskPriority;
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
  notes: string;
  exercises: WorkoutExerciseDraft[];
};

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
  created_at: string;
  updated_at: string;
  exercises: WorkoutExercise[];
};

