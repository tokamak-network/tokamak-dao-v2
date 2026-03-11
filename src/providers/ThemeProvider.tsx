"use client";

import * as React from "react";

type Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }, []);

  const setTheme = React.useCallback(() => {}, []);

  const value = React.useMemo(
    () => ({ theme: "dark" as const, resolvedTheme: "dark" as const, setTheme }),
    [setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
