"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
type Theme = "light" | "dark" | "system";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", setTheme: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, update] = useState<Theme>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("daybreak-theme");
      if (saved === "light" || saved === "dark" || saved === "system")
        update(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const setTheme = (value: Theme) => {
    update(value);
    try {
      localStorage.setItem("daybreak-theme", value);
    } catch {}
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeControl() {
  const { theme, setTheme } = useContext(ThemeContext);
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <label className="theme-control">
      <Icon size={16} aria-hidden="true" />
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
