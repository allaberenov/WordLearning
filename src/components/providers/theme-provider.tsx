"use client";

import { useEffect } from "react";

function applyTheme(theme: string | null) {
  const selected = theme || "SYSTEM";
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", selected === "DARK" || (selected === "SYSTEM" && prefersDark));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(localStorage.getItem("theme"));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(localStorage.getItem("theme"));
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return children;
}

export function setClientTheme(theme: string) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
}
