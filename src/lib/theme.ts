export type ThemePref = "system" | "light" | "dark";

export const THEME_LABELS: Record<ThemePref, string> = { system: "Sistema", light: "Claro", dark: "Escuro" };

const KEY = "memo-theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && systemDark.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function saveThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Sem armazenamento: o tema vale só até fechar o app.
  }
  if (document.startViewTransition) document.startViewTransition(() => apply(pref));
  else apply(pref);
}

apply(loadThemePref());
systemDark.addEventListener("change", () => apply(loadThemePref()));
// A outra janela (barra flutuante) recebe a troca de tema pelo evento "storage".
window.addEventListener("storage", (e) => e.key === KEY && apply(loadThemePref()));

export type TextSize = "sm" | "md" | "lg";
export type Density = "comfortable" | "compact";

export const SIZE_LABELS: Record<TextSize, string> = { sm: "Pequeno", md: "Normal", lg: "Grande" };
export const DENSITY_LABELS: Record<Density, string> = { comfortable: "Confortável", compact: "Compacta" };

function loadPref<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T;
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export const loadSize = () => loadPref<TextSize>("memo-size", ["sm", "md", "lg"], "md");
export const loadDensity = () => loadPref<Density>("memo-density", ["comfortable", "compact"], "comfortable");

function applyDisplay() {
  document.documentElement.dataset.text = loadSize();
  document.documentElement.dataset.density = loadDensity();
}

export function saveDisplay(key: "memo-size" | "memo-density", value: TextSize | Density) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento: vale só até fechar o app.
  }
  applyDisplay();
}

applyDisplay();
window.addEventListener("storage", (e) => (e.key === "memo-size" || e.key === "memo-density") && applyDisplay());
