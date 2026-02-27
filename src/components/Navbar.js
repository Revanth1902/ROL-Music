import { useState, useContext } from "react";
import { ThemeContext } from "../ThemeContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <nav className={`navbar ${theme}`}>
      <div className="logo">MyApp</div>
      <button className="toggle-button" onClick={() => setOpen(!open)}>
        ☰
      </button>
      <ul className={`nav-links ${open ? "active" : ""}`}>
        <li>Home</li>
        <li>About</li>
        <li>Contact</li>
        <li>
          <button onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
