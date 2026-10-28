import { useState } from "react";

import FitnessView from "./features/fitness/FitnessView";
import NutritionView from "./features/nutrition/NutritionView";
import PlannerView from "./features/planner/PlannerView";

type Section = "planner" | "fitness" | "nutrition";

const sections: Array<{ id: Section; icon: string; label: string }> = [
  { id: "planner", icon: "✓", label: "Планы" },
  { id: "fitness", icon: "◇", label: "Тренировки" },
  { id: "nutrition", icon: "◒", label: "Питание" },
];

export default function App() {
  const [section, setSection] = useState<Section>("planner");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <div>
            <span>Personal OS</span>
            <small>my daily space</small>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Основная навигация">
          {sections.map((item) => (
            <button
              className={`nav-item ${section === item.id ? "nav-item-active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">Небольшие шаги складываются в спокойный день.</div>
      </aside>

      <main className="main-content">
        {section === "planner" && <PlannerView />}
        {section === "fitness" && <FitnessView />}
        {section === "nutrition" && <NutritionView />}
      </main>

      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {sections.map((item) => (
          <button
            className={section === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
          >
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
