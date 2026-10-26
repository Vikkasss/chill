import type {
  Task,
  TaskDraft,
  TaskUpdate,
  Workout,
  WorkoutDraft,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listTasks(date?: string, completed?: boolean): Promise<Task[]> {
  const parameters = new URLSearchParams();
  if (date) parameters.set("date", date);
  if (completed !== undefined) parameters.set("completed", String(completed));
  const query = parameters.size ? `?${parameters.toString()}` : "";
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(task: TaskDraft): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function setTaskCompleted(taskId: number, completed: boolean): Promise<Task> {
  return request<Task>(`/tasks/${taskId}/completion`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

export function updateTask(taskId: number, update: TaskUpdate): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export function deleteTask(taskId: number): Promise<void> {
  return request<void>(`/tasks/${taskId}`, { method: "DELETE" });
}

export function listWorkouts(): Promise<Workout[]> {
  return request<Workout[]>("/workouts");
}

export function createWorkout(workout: WorkoutDraft): Promise<Workout> {
  return request<Workout>("/workouts", {
    method: "POST",
    body: JSON.stringify(workout),
  });
}

