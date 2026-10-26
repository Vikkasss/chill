import { FormEvent, useCallback, useEffect, useState } from "react";

import { createWorkout, listWorkouts } from "../../api";
import type { Workout, WorkoutExerciseDraft, WorkoutSetDraft } from "../../types";
import { localDate, readableDate } from "../../utils/date";

function emptySet(): WorkoutSetDraft {
  return { weight_kg: 0, reps: 10 };
}

function emptyExercise(): WorkoutExerciseDraft {
  return { name: "", sets: [emptySet()] };
}

export default function FitnessView() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [title, setTitle] = useState("");
  const [performedOn, setPerformedOn] = useState(localDate);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExerciseDraft[]>([emptyExercise()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkouts(await listWorkouts());
    } catch {
      setError("Не удалось загрузить историю тренировок.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  function updateExerciseName(exerciseIndex: number, name: string) {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, name } : exercise,
      ),
    );
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSetDraft,
    value: number,
  ) {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((workoutSet, currentSetIndex) =>
                currentSetIndex === setIndex
                  ? { ...workoutSet, [field]: value }
                  : workoutSet,
              ),
            }
          : exercise,
      ),
    );
  }

  function addSet(exerciseIndex: number) {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                { ...(exercise.sets.at(-1) ?? emptySet()) },
              ],
            }
          : exercise,
      ),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: exercise.sets.filter((_, itemIndex) => itemIndex !== setIndex) }
          : exercise,
      ),
    );
  }

  function removeExercise(exerciseIndex: number) {
    setExercises((current) => current.filter((_, index) => index !== exerciseIndex));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || exercises.some((exercise) => !exercise.name.trim())) return;

    setSaving(true);
    setError(null);
    try {
      await createWorkout({
        title: title.trim(),
        performed_on: performedOn,
        notes: notes.trim(),
        exercises: exercises.map((exercise) => ({
          ...exercise,
          name: exercise.name.trim(),
        })),
      });
      setTitle("");
      setNotes("");
      setExercises([emptyExercise()]);
      await loadWorkouts();
    } catch {
      setError("Не удалось сохранить тренировку. Проверьте упражнения и подходы.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Fitness · v0.3</p>
          <h1>Тренировки</h1>
        </div>
        <div className="progress-pill">
          <strong>{workouts.length}</strong>
          <span>в истории</span>
        </div>
      </header>

      <div className="fitness-layout">
        <section className="planner-card workout-builder">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Новая запись</p>
              <h2>Добавить тренировку</h2>
            </div>
          </div>

          <form className="workout-form" onSubmit={handleSubmit}>
            <div className="workout-meta-grid">
              <label>
                <span>Название</span>
                <input
                  maxLength={160}
                  placeholder="Например, ноги и корпус"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                <span>Дата</span>
                <input
                  type="date"
                  value={performedOn}
                  onChange={(event) => setPerformedOn(event.target.value)}
                />
              </label>
            </div>

            <label>
              <span>Заметка</span>
              <textarea
                maxLength={2000}
                placeholder="Самочувствие, цель или комментарий"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="exercise-list">
              {exercises.map((exercise, exerciseIndex) => (
                <div className="exercise-editor" key={exerciseIndex}>
                  <div className="exercise-header">
                    <strong>Упражнение {exerciseIndex + 1}</strong>
                    {exercises.length > 1 && (
                      <button
                        className="danger-link"
                        type="button"
                        onClick={() => removeExercise(exerciseIndex)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <input
                    aria-label={`Название упражнения ${exerciseIndex + 1}`}
                    maxLength={160}
                    placeholder="Название упражнения"
                    value={exercise.name}
                    onChange={(event) => updateExerciseName(exerciseIndex, event.target.value)}
                  />

                  <div className="set-list">
                    {exercise.sets.map((workoutSet, setIndex) => (
                      <div className="set-row" key={setIndex}>
                        <span className="set-number">{setIndex + 1}</span>
                        <label>
                          <span>Вес, кг</span>
                          <input
                            min="0"
                            max="1000"
                            step="0.5"
                            type="number"
                            value={workoutSet.weight_kg}
                            onChange={(event) =>
                              updateSet(exerciseIndex, setIndex, "weight_kg", Number(event.target.value))
                            }
                          />
                        </label>
                        <label>
                          <span>Повторы</span>
                          <input
                            min="1"
                            max="1000"
                            type="number"
                            value={workoutSet.reps}
                            onChange={(event) =>
                              updateSet(exerciseIndex, setIndex, "reps", Number(event.target.value))
                            }
                          />
                        </label>
                        {exercise.sets.length > 1 && (
                          <button
                            aria-label={`Удалить подход ${setIndex + 1}`}
                            className="remove-set"
                            type="button"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="text-button" type="button" onClick={() => addSet(exerciseIndex)}>
                    + Подход
                  </button>
                </div>
              ))}
            </div>

            <div className="builder-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setExercises((current) => [...current, emptyExercise()])}
              >
                + Упражнение
              </button>
              <button
                className="add-button compact"
                type="submit"
                disabled={saving || !title.trim()}
              >
                {saving ? "Сохраняю…" : "Сохранить тренировку"}
              </button>
            </div>
          </form>
        </section>

        <section className="workout-history">
          <div className="section-heading history-heading">
            <div>
              <p className="eyebrow">История</p>
              <h2>Последние тренировки</h2>
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void loadWorkouts()}>Повторить</button>
            </div>
          )}

          {loading ? (
            <div className="history-empty">Загружаю историю…</div>
          ) : workouts.length === 0 ? (
            <div className="history-empty">Первая тренировка появится здесь.</div>
          ) : (
            <div className="history-list">
              {workouts.map((workout) => (
                <article className="workout-card" key={workout.id}>
                  <header>
                    <div>
                      <h3>{workout.title}</h3>
                      <p>{readableDate(workout.performed_on)}</p>
                    </div>
                    <span>{workout.exercises.length} упр.</span>
                  </header>
                  {workout.notes && <p className="workout-notes">{workout.notes}</p>}
                  <div className="history-exercises">
                    {workout.exercises.map((exercise) => (
                      <div className="history-exercise" key={exercise.id}>
                        <strong>{exercise.name}</strong>
                        <div className="set-chips">
                          {exercise.sets.map((workoutSet) => (
                            <span key={workoutSet.id}>
                              {workoutSet.weight_kg > 0 ? `${workoutSet.weight_kg} кг` : "без веса"}
                              {" × "}{workoutSet.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
