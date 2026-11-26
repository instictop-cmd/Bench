"use client";

import Link from "next/link";
import { useProgress } from "@/lib/useProgress";
import { QUESTS } from "@/game/quests";

export function ProgressStrip() {
  const progress = useProgress();
  const operatorDone = QUESTS.filter(
    (quest) => quest.rank === "operator" && progress.completed.includes(quest.id),
  ).length;

  if (!progress.xp && progress.completed.length === 0) return null;

  return (
    <div className="fade-up mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-edge bg-panel px-3 py-2">
      <span className="pxfont text-[8px] tracking-[0.14em] text-accent">
        OPERATOR
      </span>
      <span className="termfont text-[17px] text-ink">{progress.xp} xp</span>
      <span className="termfont text-[16px] text-dim">
        quest {operatorDone} / 5
      </span>
      <Link
        href="/campus"
        className="termfont ml-auto text-[16px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
      >
        continue →
      </Link>
    </div>
  );
}
