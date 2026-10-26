import { useState } from "react";

import FitnessView from "./features/fitness/FitnessView";
import PlannerView from "./features/planner/PlannerView";

type Section = "planner" | "fitness";

export default function App() {
  const [section, setSection] = useState<Section>("planner");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>Personal OS</span>
        </div>
        <nav className="primary-nav" aria-label="Основная навигация">
          <button
            className={`nav-item ${section === "planner" ? "nav-item-active" : ""}`}
            type="button"
            onClick={() => setSection("planner")}
          >
            <span>◷</span> Planner
          </button>
          <button
            className={`nav-item ${section === "fitness" ? "nav-item-active" : ""}`}
            type="button"
            onClick={() => setSection("fitness")}
          >
            <span>◇</span> Fitness <small>v0.3</small>
          </button>
        </nav>
        <div className="sidebar-note">Меньше шума. Больше завершённых дел.</div>
      </aside>

      <main className="main-content">
        {section === "planner" ? <PlannerView /> : <FitnessView />}
      </main>

      <nav className="mobile-nav" aria-label="Мобильная навигация">
        <button
          className={section === "planner" ? "active" : ""}
          type="button"
          onClick={() => setSection("planner")}
        >
          <span>◷</span>Planner
        </button>
        <button
          className={section === "fitness" ? "active" : ""}
          type="button"
          onClick={() => setSection("fitness")}
        >
          <span>◇</span>Fitness
        </button>
      </nav>
    </div>
  );
}
