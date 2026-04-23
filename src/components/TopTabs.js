import { NavLink } from "react-router-dom";

export default function TopTabs({ tabs }) {
  return (
    <nav className="tabs" role="tablist" aria-label="Dashboard sections">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          role="tab"
          className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
          end={t.to === "/"}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
