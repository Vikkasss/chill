import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  createNutritionEntry,
  deleteNutritionEntry,
  getNutritionDay,
  listNutritionEntries,
  updateNutritionEntry,
  updateNutritionGoals,
} from "../../api";
import type { NutritionDay, NutritionEntry, NutritionGoals } from "../../types";
import { localDate, readableDate } from "../../utils/date";

type ActivityRingProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  secondColor: string;
};

function displayNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ActivityRing({ label, value, goal, unit, color, secondColor }: ActivityRingProps) {
  const ratio = goal > 0 ? value / goal : 0;
  const firstLap = Math.min(ratio, 1);
  const secondLap = Math.min(Math.max(ratio - 1, 0), 1);
  const outerRadius = 54;
  const innerRadius = 43;
  const outerLength = 2 * Math.PI * outerRadius;
  const innerLength = 2 * Math.PI * innerRadius;

  return (
    <article className="activity-ring-card">
      <div className="activity-ring">
        <svg aria-hidden="true" viewBox="0 0 140 140">
          <circle className="ring-track" cx="70" cy="70" fill="none" r={outerRadius} strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            fill="none"
            r={outerRadius}
            stroke={color}
            strokeDasharray={outerLength}
            strokeDashoffset={outerLength * (1 - firstLap)}
            strokeLinecap="round"
            strokeWidth="10"
          />
          <circle className="ring-track second" cx="70" cy="70" fill="none" r={innerRadius} strokeWidth="6" />
          <circle
            cx="70"
            cy="70"
            fill="none"
            r={innerRadius}
            stroke={secondColor}
            strokeDasharray={innerLength}
            strokeDashoffset={innerLength * (1 - secondLap)}
            strokeLinecap="round"
            strokeWidth="6"
          />
        </svg>
        <div className="ring-value">
          <strong>{displayNumber(value)}</strong>
          <span>из {displayNumber(goal)} {unit}</span>
        </div>
      </div>
      <div>
        <h2>{label}</h2>
        <p>{Math.round(ratio * 100)}% дневной цели</p>
      </div>
    </article>
  );
}

export default function NutritionView() {
  const today = localDate();
  const [day, setDay] = useState<NutritionDay | null>(null);
  const [history, setHistory] = useState<NutritionEntry[]>([]);
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);
  const [editProtein, setEditProtein] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [settings, setSettings] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentDay, entries] = await Promise.all([
        getNutritionDay(today),
        listNutritionEntries(),
      ]);
      setDay(currentDay);
      setHistory(entries);
    } catch {
      setError("Не удалось загрузить данные питания.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const proteinValue = Number(protein || 0);
    const calorieValue = Number(calories || 0);
    if (proteinValue <= 0 && calorieValue <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await createNutritionEntry({
        consumed_on: today,
        protein_g: proteinValue,
        calories: calorieValue,
      });
      setProtein("");
      setCalories("");
      await loadDay();
    } catch {
      setError("Не удалось добавить запись.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entryId: number) {
    if (!window.confirm("Удалить эту запись из истории питания?")) return;
    setError(null);
    try {
      await deleteNutritionEntry(entryId);
      await loadDay();
    } catch {
      setError("Не удалось удалить запись.");
    }
  }

  function startEditingEntry(entry: NutritionEntry) {
    setEditingEntry(entry);
    setEditProtein(String(entry.protein_g));
    setEditCalories(String(entry.calories));
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry) return;
    const proteinValue = Number(editProtein || 0);
    const calorieValue = Number(editCalories || 0);
    if (proteinValue <= 0 && calorieValue <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await updateNutritionEntry(editingEntry.id, {
        protein_g: proteinValue,
        calories: calorieValue,
      });
      setEditingEntry(null);
      await loadDay();
    } catch {
      setError("Не удалось изменить запись питания.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await updateNutritionGoals(settings);
      setSettings(null);
      await loadDay();
    } catch {
      setError("Не удалось сохранить дневные цели.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Питание · v0.4</p>
          <h1>{readableDate(today)}</h1>
        </div>
        <button
          className="settings-button"
          type="button"
          disabled={!day}
          onClick={() => day && setSettings({ ...day.goals })}
        >
          <span>⚙</span> Цели
        </button>
      </header>

      {error && (
        <div className="error-banner standalone" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadDay()}>Повторить</button>
        </div>
      )}

      {loading || !day ? (
        <div className="history-empty nutrition-loading">Загружаю прогресс дня…</div>
      ) : (
        <>
          <section className="nutrition-rings">
            <ActivityRing
              color="#ef8c9a"
              goal={day.goals.protein_goal}
              label="Белок"
              secondColor="#c95d75"
              unit="г"
              value={day.totals.protein_g}
            />
            <ActivityRing
              color="#83bca4"
              goal={day.goals.calorie_goal}
              label="Калории"
              secondColor="#4f8e75"
              unit="ккал"
              value={day.totals.calories}
            />
          </section>

          <div className="nutrition-layout">
            <section className="surface-card nutrition-entry-card">
              <div className="section-heading">
                <p className="eyebrow">Новая запись</p>
                <h2>Добавить еду</h2>
              </div>
              <form className="nutrition-form" onSubmit={addEntry}>
                <label>
                  <span>Белок, г</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    step="0.1"
                    type="number"
                    value={protein}
                    onChange={(event) => setProtein(event.target.value)}
                  />
                </label>
                <label>
                  <span>Калории, ккал</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    step="1"
                    type="number"
                    value={calories}
                    onChange={(event) => setCalories(event.target.value)}
                  />
                </label>
                <button className="primary-button" type="submit" disabled={saving || (!protein && !calories)}>
                  {saving ? "Добавляю…" : "Добавить"}
                </button>
              </form>
            </section>

            <section className="nutrition-history">
              <div className="section-heading history-heading">
                <p className="eyebrow">Все даты</p>
                <h2>История</h2>
              </div>
              {history.length === 0 ? (
                <div className="history-empty">История пока пуста.</div>
              ) : (
                <div className="nutrition-entry-list">
                  {history.map((entry) => (
                    <article className="nutrition-entry" key={entry.id}>
                      <div className="nutrition-entry-icon">◒</div>
                      <div>
                        <strong>{displayNumber(entry.protein_g)} г белка</strong>
                        <span>{entry.calories} ккал · {readableDate(entry.consumed_on)}</span>
                      </div>
                      <div className="nutrition-entry-actions">
                        <button aria-label="Редактировать запись" className="edit-icon-button" type="button" onClick={() => startEditingEntry(entry)}>✎</button>
                        <button aria-label="Удалить запись" className="delete-icon-button" type="button" onClick={() => void removeEntry(entry.id)}>×</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {editingEntry && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setEditingEntry(null)}>
          <section
            aria-labelledby="nutrition-entry-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-icon nutrition-modal-icon">◒</div>
            <p className="eyebrow">История питания</p>
            <h2 id="nutrition-entry-title">Редактировать запись</h2>
            <form className="settings-form" onSubmit={saveEntry}>
              <label>
                <span>Белок, г</span>
                <input
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={editProtein}
                  onChange={(event) => setEditProtein(event.target.value)}
                />
              </label>
              <label>
                <span>Калории, ккал</span>
                <input
                  inputMode="numeric"
                  min="0"
                  step="1"
                  type="number"
                  value={editCalories}
                  onChange={(event) => setEditCalories(event.target.value)}
                />
              </label>
              <div className="form-actions modal-actions">
                <button className="secondary-button" type="button" disabled={saving} onClick={() => setEditingEntry(null)}>Отмена</button>
                <button
                  className="primary-button compact"
                  type="submit"
                  disabled={saving || (Number(editProtein || 0) <= 0 && Number(editCalories || 0) <= 0)}
                >
                  {saving ? "Сохраняю…" : "Сохранить"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {settings && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setSettings(null)}>
          <section
            aria-labelledby="nutrition-settings-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-icon nutrition-modal-icon">◒</div>
            <p className="eyebrow">Настройки</p>
            <h2 id="nutrition-settings-title">Дневные цели</h2>
            <form className="settings-form" onSubmit={saveSettings}>
              <label>
                <span>Белок, г</span>
                <input
                  min="1"
                  step="0.1"
                  type="number"
                  value={settings.protein_goal}
                  onChange={(event) => setSettings({ ...settings, protein_goal: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>Калории, ккал</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={settings.calorie_goal}
                  onChange={(event) => setSettings({ ...settings, calorie_goal: Number(event.target.value) })}
                />
              </label>
              <div className="form-actions modal-actions">
                <button className="secondary-button" type="button" disabled={saving} onClick={() => setSettings(null)}>Отмена</button>
                <button className="primary-button compact" type="submit" disabled={saving}>Сохранить</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
