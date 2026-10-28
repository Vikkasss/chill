import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  createTask,
  deleteTask,
  listTasks,
  setTaskCompleted,
  updateTask,
} from "../../api";
import type {
  Task,
  TaskCompletionFilter,
  TaskDraft,
  TaskPriority,
} from "../../types";
import { localDate, readableDate } from "../../utils/date";

type ViewMode = "day" | "list";

const priorityLabels: Record<TaskPriority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const filterLabels: Record<TaskCompletionFilter, string> = {
  all: "Все",
  active: "В работе",
  completed: "Готово",
};

const priorities: TaskPriority[] = ["low", "medium", "high"];

type PriorityPickerProps = {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  compact?: boolean;
};

function PriorityPicker({ value, onChange, compact = false }: PriorityPickerProps) {
  return (
    <div className={`priority-picker ${compact ? "compact" : ""}`} aria-label="Приоритет">
      {priorities.map((priority) => (
        <button
          aria-label={`Приоритет: ${priorityLabels[priority]}`}
          aria-pressed={value === priority}
          className={`priority-choice priority-choice-${priority} ${value === priority ? "selected" : ""}`}
          key={priority}
          title={priorityLabels[priority]}
          type="button"
          onClick={() => onChange(priority)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

export default function PlannerView() {
  const [view, setView] = useState<ViewMode>("day");
  const [filter, setFilter] = useState<TaskCompletionFilter>("all");
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(localDate);
  const [priority, setPriority] = useState<TaskPriority>("low");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const completed = filter === "all" ? undefined : filter === "completed";
    try {
      setTasks(await listTasks(view === "day" ? selectedDate : undefined, completed));
    } catch {
      setError("Не удалось загрузить задачи. Проверьте, что API запущен.");
    } finally {
      setLoading(false);
    }
  }, [filter, selectedDate, view]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await createTask({ title: title.trim(), due_date: deadline, priority });
      setTitle("");
      setSelectedDate(deadline);
      await loadTasks();
    } catch {
      setError("Не удалось сохранить задачу. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed: !item.completed } : item,
      ),
    );
    try {
      await setTaskCompleted(task.id, !task.completed);
      await loadTasks();
    } catch {
      setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
      setError("Не удалось изменить задачу.");
    }
  }

  function beginEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      due_date: task.due_date,
      priority: task.base_priority,
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingTaskId === null || !editDraft?.title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await updateTask(editingTaskId, {
        ...editDraft,
        title: editDraft.title.trim(),
      });
      setEditingTaskId(null);
      setEditDraft(null);
      await loadTasks();
    } catch {
      setError("Не удалось сохранить изменения.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
    setError(null);
    try {
      await deleteTask(task.id);
      await loadTasks();
    } catch {
      setError("Не удалось удалить задачу.");
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Планы · v0.4</p>
          <h1>{view === "day" ? readableDate(selectedDate) : "Все задачи"}</h1>
        </div>
        <div className="progress-pill">
          <strong>{completedCount}</strong>
          <span>из {tasks.length} готово</span>
        </div>
      </header>

      <section className="day-progress-card">
        <div>
          <span>Прогресс дня</span>
          <strong>{tasks.length === 0 ? "Свободный день" : `${completedCount} из ${tasks.length}`}</strong>
          <p>{completedCount === tasks.length && tasks.length > 0 ? "Всё запланированное выполнено" : "Двигайтесь в своём темпе"}</p>
        </div>
        <div
          className="mini-progress-ring"
          style={{ "--progress": `${tasks.length ? completedCount / tasks.length : 0}` } as React.CSSProperties}
        >
          {tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%
        </div>
      </section>

      <section className="toolbar" aria-label="Настройки представления">
        <div className="toolbar-group">
          <div className="segmented-control">
            <button className={view === "day" ? "active" : ""} type="button" onClick={() => setView("day")}>День</button>
            <button className={view === "list" ? "active" : ""} type="button" onClick={() => setView("list")}>Список</button>
          </div>
          <div className="filter-control" aria-label="Фильтр задач">
            {(Object.keys(filterLabels) as TaskCompletionFilter[]).map((value) => (
              <button className={filter === value ? "active" : ""} key={value} type="button" onClick={() => setFilter(value)}>
                {filterLabels[value]}
              </button>
            ))}
          </div>
        </div>
        {view === "day" && (
          <label className="date-control">
            <span>Показать срок</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
        )}
      </section>

      <section className="surface-card planner-card">
        <form className="task-form" onSubmit={handleSubmit}>
          <input
            aria-label="Название задачи"
            maxLength={160}
            placeholder="Что важно сделать?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="task-schedule-controls">
            <PriorityPicker value={priority} onChange={setPriority} />
            <label className="deadline-picker">
              <input aria-label="Срок выполнения" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Сохраняю…" : "Добавить"}
          </button>
        </form>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void loadTasks()}>Повторить</button>
          </div>
        )}

        <div className="task-list" aria-live="polite">
          {loading ? (
            <div className="empty-state">Загружаю ваш день…</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✓</span>
              <h2>Здесь пока спокойно</h2>
              <p>Добавьте задачу или выберите другой срок.</p>
            </div>
          ) : (
            tasks.map((task) =>
              editingTaskId === task.id && editDraft ? (
                <form className="task-edit-form" key={task.id} onSubmit={saveEdit}>
                  <input
                    aria-label="Новое название задачи"
                    maxLength={160}
                    value={editDraft.title}
                    onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                  />
                  <div className="task-schedule-controls">
                    <PriorityPicker compact value={editDraft.priority} onChange={(value) => setEditDraft({ ...editDraft, priority: value })} />
                    <label className="deadline-picker">
                      <input
                        aria-label="Новый срок выполнения"
                        type="date"
                        value={editDraft.due_date}
                        onChange={(event) => setEditDraft({ ...editDraft, due_date: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditingTaskId(null)}>Отмена</button>
                    <button className="primary-button compact" type="submit" disabled={saving}>Сохранить</button>
                  </div>
                </form>
              ) : (
                <article className={`task-row ${task.completed ? "completed" : ""}`} key={task.id}>
                  <button
                    aria-label={task.completed ? "Вернуть задачу в работу" : "Завершить задачу"}
                    className="task-check"
                    type="button"
                    onClick={() => void toggleTask(task)}
                  >
                    {task.completed ? "✓" : ""}
                  </button>
                  <div className="task-copy">
                    <h2>{task.title}</h2>
                    <p>Срок: {readableDate(task.due_date)}</p>
                  </div>
                  <span className={`priority priority-${task.priority}`}>
                    <i />{priorityLabels[task.priority]}
                    {task.priority !== task.base_priority && <small>авто</small>}
                  </span>
                  <div className="task-actions">
                    <button type="button" onClick={() => beginEdit(task)}>Изменить</button>
                    <button className="danger-link" type="button" onClick={() => void removeTask(task)}>Удалить</button>
                  </div>
                </article>
              ),
            )
          )}
        </div>
      </section>
    </>
  );
}
