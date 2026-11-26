"use client";

import { useSyncExternalStore } from "react";
import { readXp, subscribeProgress } from "./progress";

const getServerSnapshot = () => 0;

export function useXp(): number {
  return useSyncExternalStore(subscribeProgress, readXp, getServerSnapshot);
}
