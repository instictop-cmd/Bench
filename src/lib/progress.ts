export type Progress = {
  xp: number;
  completed: string[];
  artifacts: string[];
};

const KEY = "bench.progress.v2";
const OLD_XP = "bench.xp";
const OLD_QUEST = "bench.quest.1.done";
const OLD_ITEM = "bench.item.clarity-lens";

export const PROGRESS_EVENT = "bench:progress";

function empty(): Progress {
  return { xp: 0, completed: [], artifacts: [] };
}

function migrate(): Progress {
  if (typeof window === "undefined") return empty();

  const progress = empty();
  const xp = Number(window.localStorage.getItem(OLD_XP) ?? 0);
  if (Number.isFinite(xp) && xp > 0) progress.xp = xp;

  if (window.localStorage.getItem(OLD_QUEST)) progress.completed.push("op-01");
  if (window.localStorage.getItem(OLD_ITEM)) progress.artifacts.push("clarity-lens");

  return progress;
}

export function decodeProgress(raw: string | null): Progress {
  if (!raw) return empty();

  try {
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      xp:
        typeof parsed.xp === "number" && Number.isFinite(parsed.xp)
          ? parsed.xp
          : 0,
      completed: Array.isArray(parsed.completed)
        ? parsed.completed.filter((id): id is string => typeof id === "string")
        : [],
      artifacts: Array.isArray(parsed.artifacts)
        ? parsed.artifacts.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return empty();
  }
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return empty();

  const raw = window.localStorage.getItem(KEY);
  if (raw) return decodeProgress(raw);

  const migrated = migrate();
  window.localStorage.setItem(KEY, JSON.stringify(migrated));
  return migrated;
}

function writeProgress(progress: Progress) {
  window.localStorage.setItem(KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function completeQuest(
  id: string,
  xp: number,
  artifactId?: string,
): boolean {
  if (typeof window === "undefined") return false;

  const progress = readProgress();
  if (progress.completed.includes(id)) {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
    return false;
  }

  progress.completed.push(id);
  progress.xp += xp;
  if (artifactId && !progress.artifacts.includes(artifactId)) {
    progress.artifacts.push(artifactId);
  }

  writeProgress(progress);
  return true;
}

export function readXp(): number {
  return readProgress().xp;
}

export function hasItem(id: string): boolean {
  return readProgress().artifacts.includes(id);
}

export function progressSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
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
