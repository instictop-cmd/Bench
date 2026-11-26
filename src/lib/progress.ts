type Award = { xp: number; key: string; item?: string };

const XP_KEY = "bench.xp";
const itemKey = (id: string) => `bench.item.${id}`;

export const PROGRESS_EVENT = "bench:progress";

export function readXp(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(XP_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function subscribeProgress(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROGRESS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function awardOnce(award: Award): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(award.key)) return false;

  window.localStorage.setItem(award.key, "1");
  window.localStorage.setItem(XP_KEY, String(readXp() + award.xp));
  if (award.item) window.localStorage.setItem(itemKey(award.item), "1");

  window.dispatchEvent(new Event(PROGRESS_EVENT));
  return true;
}

export function hasItem(id: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(itemKey(id)) === "1";
}
