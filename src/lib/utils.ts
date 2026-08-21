export function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEVICE_ID_KEY = "asmr_device_id";
const GENDER_KEY = "asmr_gender";
const WATCHED_KEY = "asmr_watched";
const MAX_WATCHED = 500; // Keep only last 500 to avoid localStorage overflow

export function getStoredDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_ID_KEY);
}

export function storeDeviceId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEVICE_ID_KEY, id);
}

export function getStoredGender(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GENDER_KEY);
}

export function storeGender(gender: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GENDER_KEY, gender);
}

export function getWatchedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHED_KEY);
    if (!raw) return [];
    const ids: string[] = JSON.parse(raw);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function addWatchedId(videoId: string): void {
  if (typeof window === "undefined") return;
  const ids = getWatchedIds();
  if (ids.includes(videoId)) return;

  // Add to end, keep only last MAX_WATCHED
  ids.push(videoId);
  if (ids.length > MAX_WATCHED) {
    ids.splice(0, ids.length - MAX_WATCHED);
  }
  localStorage.setItem(WATCHED_KEY, JSON.stringify(ids));
}

export function clearWatchedIds(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WATCHED_KEY);
}

export function formatViews(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1) + "K";
  return String(count);
}
