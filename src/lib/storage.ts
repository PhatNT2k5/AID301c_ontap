// localStorage wrapper: storage may be unavailable (private mode, blocked site data),
// in which case the app still works but progress is not kept.
const PREFIX = "aid301c:";

export const loadJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const saveJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: progress only lives for this page visit.
  }
};

export const removeKey = (key: string): void => {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
};
