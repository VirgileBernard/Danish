import { useState, useEffect } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "dwc-theme";

/**
 * Hook qui gère le thème dark/light de l'application.
 * - Persiste le choix dans localStorage
 * - Applique l'attribut `data-theme` sur <html>
 * - Default : 'dark' (ou la valeur sauvegardée si elle existe)
 */
export function useTheme() {
  // [1] State du thème, initialisé à partir du localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);
  // [3] Fonction pour basculer
  function toggleTheme() {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
