import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createWorkout, deleteWorkout, listWorkouts, updateWorkout } from "../../api";
import type { Workout } from "../../types";
import { localDate, readableDate } from "../../utils/date";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 12);
}

function calendarDays(anchor: Date) {
  const first = monthStart(anchor);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function FitnessView() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parseDate(localDate())));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [focus, setFocus] = useState("");
  const [creatineTaken, setCreatineTaken] = useState(false);
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

  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const workoutByDate = useMemo(() => {
    const mappedWorkouts = new Map<string, Workout>();
    workouts.forEach((workout) => {
      if (!mappedWorkouts.has(workout.performed_on)) {
        mappedWorkouts.set(workout.performed_on, workout);
      }
    });
    return mappedWorkouts;
  }, [workouts]);
  const workoutStatusByDate = useMemo(() => {
    const statuses = new Map<string, { count: number; creatineTaken: boolean }>();
    workouts.forEach((workout) => {
      const current = statuses.get(workout.performed_on) ?? {
        count: 0,
        creatineTaken: false,
      };
      statuses.set(workout.performed_on, {
        count: current.count + 1,
        creatineTaken: current.creatineTaken || workout.creatine_taken,
      });
    });
    return statuses;
  }, [workouts]);

  const monthTitle = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function openWorkout(date: Date, workout = workoutByDate.get(dateKey(date))) {
    const key = dateKey(date);
    setSelectedDate(key);
    setEditingWorkoutId(workout?.id ?? null);
    setFocus(workout?.title ?? "");
    setCreatineTaken(workout?.creatine_taken ?? false);
    if (date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(monthStart(date));
    }
  }

  function closeWorkout() {
    setSelectedDate(null);
    setEditingWorkoutId(null);
    setFocus("");
    setCreatineTaken(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || !focus.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (editingWorkoutId === null) {
        await createWorkout({
          title: focus.trim(),
          performed_on: selectedDate,
          creatine_taken: creatineTaken,
        });
      } else {
        await updateWorkout(editingWorkoutId, {
          title: focus.trim(),
          creatine_taken: creatineTaken,
        });
      }
      closeWorkout();
      await loadWorkouts();
    } catch {
      setError("Не удалось сохранить тренировку. На одну дату можно добавить только одну запись.");
    } finally {
      setSaving(false);
    }
  }

  async function removeWorkout() {
    if (editingWorkoutId === null) return;
    if (!window.confirm("Удалить эту тренировку?")) return;

    setSaving(true);
    setError(null);
    try {
      await deleteWorkout(editingWorkoutId);
      closeWorkout();
      await loadWorkouts();
    } catch {
      setError("Не удалось удалить тренировку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Тренировки · v0.4</p>
          <h1>Календарь движения</h1>
        </div>
        <div className="progress-pill">
          <strong>{workouts.length}</strong>
          <span>в истории</span>
        </div>
      </header>

      <div className="fitness-layout calendar-layout">
        <section className="surface-card calendar-card">
          <header className="calendar-header">
            <button aria-label="Предыдущий месяц" type="button" onClick={() => shiftMonth(-1)}>‹</button>
            <div>
              <span>Календарь</span>
              <h2>{monthTitle}</h2>
            </div>
            <button aria-label="Следующий месяц" type="button" onClick={() => shiftMonth(1)}>›</button>
          </header>

          <div className="calendar-weekdays" aria-hidden="true">
            {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const status = workoutStatusByDate.get(key);
              const count = status?.count ?? 0;
              const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
              return (
                <button
                  aria-label={`${readableDate(key)}${count ? `, тренировок: ${count}` : ""}${status?.creatineTaken ? ", креатин принят" : ""}`}
                  className={`${outsideMonth ? "outside-month" : ""} ${count ? "has-workout" : ""} ${status?.creatineTaken ? "has-creatine" : ""} ${key === localDate() ? "today" : ""}`}
                  key={key}
                  type="button"
                  onClick={() => openWorkout(day)}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>
                  {status?.creatineTaken && <span aria-hidden="true" className="calendar-creatine-mark" />}
                  <small>{count > 1 ? count : ""}</small>
                </button>
              );
            })}
          </div>
          <p className="calendar-hint">
            <span><i className="workout-legend-mark" />Тренировка</span>
            <span><i className="creatine-legend-mark" />Креатин</span>
          </p>
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
                <button
                  className={`workout-card ${workout.creatine_taken ? "creatine-recorded" : ""}`}
                  key={workout.id}
                  type="button"
                  onClick={() => openWorkout(parseDate(workout.performed_on), workout)}
                >
                  <div className="workout-date-badge">
                    <strong>{parseDate(workout.performed_on).getDate()}</strong>
                    <span>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(parseDate(workout.performed_on))}</span>
                  </div>
                  <div>
                    <h3>{workout.title}</h3>
                    <p>{readableDate(workout.performed_on)}</p>
                    {workout.creatine_taken && <span className="creatine-badge">✓ Креатин</span>}
                    {workout.exercises.length > 0 && <small>Сохранено упражнений: {workout.exercises.length}</small>}
                  </div>
                  {workout.creatine_taken && <span aria-hidden="true" className="workout-creatine-strip" />}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedDate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && closeWorkout()}>
          <section
            aria-labelledby="workout-dialog-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-icon fitness-modal-icon">◇</div>
            <p className="eyebrow">{readableDate(selectedDate)}</p>
            <h2 id="workout-dialog-title">
              {editingWorkoutId === null ? "Добавить тренировку" : "Редактировать тренировку"}
            </h2>
            <form onSubmit={handleSubmit}>
              <label>
                <span>На что был упор?</span>
                <textarea
                  autoFocus
                  maxLength={160}
                  placeholder="Например, растяжка и спина"
                  rows={4}
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                />
              </label>
              <label className="creatine-checkbox">
                <input
                  checked={creatineTaken}
                  type="checkbox"
                  onChange={(event) => setCreatineTaken(event.target.checked)}
                />
                <span aria-hidden="true" className="creatine-checkbox-mark">✓</span>
                <span>
                  <strong>Креатин принят</strong>
                  <small>Отметим зелёной полоской в календаре и истории</small>
                </span>
              </label>
              <div className="form-actions modal-actions">
                {editingWorkoutId !== null && (
                  <button className="danger-button" type="button" disabled={saving} onClick={() => void removeWorkout()}>Удалить</button>
                )}
                <button className="secondary-button" type="button" disabled={saving} onClick={closeWorkout}>Отмена</button>
                <button className="primary-button compact" type="submit" disabled={saving || !focus.trim()}>
                  {saving ? "Сохраняю…" : editingWorkoutId === null ? "Добавить" : "Сохранить"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
