import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  accent: string;
  cloudIntensity: number;
};

const STORAGE_KEY = "personaliz_theme";

const defaultState: ThemeState = {
  mode: "light",
  accent: "#7b4dff",
  cloudIntensity: 1
};

export function useTheme() {
  const [state, setState] = useState<ThemeState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState;
      const parsed = JSON.parse(raw) as Partial<ThemeState>;
      return {
        mode: parsed.mode ?? defaultState.mode,
        accent: parsed.accent ?? defaultState.accent,
        cloudIntensity: parsed.cloudIntensity ?? defaultState.cloudIntensity
      };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", state.accent);
    root.style.setProperty("--accent-2", state.accent);
    root.style.setProperty("--cloud-intensity", String(state.cloudIntensity));
    root.setAttribute("data-mode", state.mode);
  }, [state]);

  const actions = useMemo(
    () => ({
      setMode: (mode: ThemeMode) => setState((s) => ({ ...s, mode })),
      setAccent: (accent: string) => setState((s) => ({ ...s, accent })),
      setCloudIntensity: (cloudIntensity: number) =>
        setState((s) => ({ ...s, cloudIntensity: Math.max(0.2, Math.min(2, cloudIntensity)) }))
    }),
    []
  );

  return { ...state, ...actions };
}
