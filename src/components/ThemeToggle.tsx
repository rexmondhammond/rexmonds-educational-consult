import { useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const current = (): Theme => (document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(current);
  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("rex.theme", next); } catch { /* storage unavailable */ }
    setTheme(next);
  };
  return (
    <button onClick={flip} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mute hover:bg-sunken hover:text-ink ${className}`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Light theme" : "Dark theme"}
    </button>
  );
}
