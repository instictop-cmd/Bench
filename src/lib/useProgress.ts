"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  decodeProgress,
  progressSnapshot,
  subscribeProgress,
  type Progress,
} from "./progress";

const getServerSnapshot = () => "";

export function useProgress(): Progress {
  const raw = useSyncExternalStore(
    subscribeProgress,
    progressSnapshot,
    getServerSnapshot,
  );

  return useMemo(() => decodeProgress(raw), [raw]);
}
