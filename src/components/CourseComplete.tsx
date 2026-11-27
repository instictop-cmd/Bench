"use client";

import Link from "next/link";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { useProgress } from "@/lib/useProgress";
import {
  allCourseItems,
  completedArtifacts,
  courseDone,
  courseTotals,
} from "@/game/course";
import { RANKS } from "@/game/types";

export function CourseComplete() {
  const progress = useProgress();
  const totals = courseTotals();
  const artifacts = completedArtifacts(progress.completed);
  const done = courseDone(progress.completed);
  const lessonsDone = allCourseItems().filter((item) =>
    progress.completed.includes(item.id),
  ).length;

  if (!done) {
    return (
      <div className="crt min-h-screen">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
          <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
            <div className="flex items-baseline gap-3">
              <Link
                href="/campus"
                className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
              >
                BENCH
              </Link>
              <span className="termfont text-[15px] text-dim">
                course complete
              </span>
            </div>
            <span className="termfont text-[15px] text-dim">
              {progress.xp} xp
            </span>
          </header>

          <main className="flex flex-1 flex-col justify-center py-10">
            <p className="kicker">not yet</p>
            <h1 className="pxfont mt-4 text-[20px] leading-[1.5] text-ink">
              THE ROOFTOP IS STILL LOCKED
            </h1>
            <p className="termfont mt-3 max-w-xl text-[19px] leading-[1.35] text-dim">
              {lessonsDone} of {totals.lessons} lessons are logged. Finish all
              six ranks and their trials to open this page.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/campus" className="pixel-btn">
                Back to campus
              </Link>
            </div>
          </main>

          <footer className="border-t-2 border-edge/60 pt-3">
            <LegalLinks />
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/campus"
              className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
            >
              BENCH
            </Link>
            <span className="termfont text-[15px] text-dim">
              course complete
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">{progress.xp} xp</span>
        </header>

        <main className="flex-1 py-8">
          <p className="kicker">the rooftop · after hours</p>
          <h1 className="pxfont mt-4 text-[22px] leading-[1.5] text-ink sm:text-[30px]">
            YOU SHIPPED.
          </h1>
          <p className="termfont mt-3 max-w-2xl text-[20px] leading-[1.35] text-dim">
            Six ranks. {totals.lessons} lessons. {totals.bosses} trials. You can
            command a model, check a claim, build a flow, give it tools, measure
            it, and ship it without panicking.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border-2 border-edge2 bg-accent/10 px-3 py-3">
              <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                experience
              </p>
              <p className="termfont mt-1 text-[24px] text-accent">
                {progress.xp} xp
              </p>
            </div>
            <div className="border-2 border-edge bg-black/20 px-3 py-3">
              <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                lessons
              </p>
              <p className="termfont mt-1 text-[24px] text-ink">
                {lessonsDone} / {totals.lessons}
              </p>
            </div>
            <div className="border-2 border-edge bg-black/20 px-3 py-3">
              <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                artifacts
              </p>
              <p className="termfont mt-1 text-[24px] text-ink">
                {artifacts.length} / {totals.lessons + totals.bosses}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/campus" className="pixel-btn">
              Back to campus
            </Link>
            <Link href="/play" className="pixel-btn pixel-btn--ghost">
              Replay the prologue
            </Link>
            <ShareButton
              label="Share the lab"
              text={`I finished all six ranks on Bench — a pixel lab for learning AI. ${progress.xp} XP.`}
            />
          </div>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="kicker">the notebook</p>
                <h2 className="pxfont mt-3 text-[14px] text-ink">
                  EVERYTHING YOU KEEP
                </h2>
              </div>
              <span className="termfont text-[15px] text-dim">
                {artifacts.length} items
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="border-2 border-edge bg-black/20 px-3 py-2"
                >
                  <p className="termfont text-[18px] text-ink">
                    {artifact.name}
                  </p>
                  <p className="termfont text-[15px] leading-snug text-dim">
                    {artifact.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <p className="kicker">the ranks</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {RANKS.map((rank) => (
                <div
                  key={rank.id}
                  className="border-2 border-edge2 bg-accent/5 px-3 py-2"
                >
                  <p className="pxfont text-[9px] text-accent">{rank.verb}</p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {rank.name}
                  </p>
                  <p className="termfont text-[14px] text-dim">{rank.zone}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">
              all {totals.lessons + totals.bosses} artifacts logged
            </span>
            <Link
              href="/"
              className="termfont text-[14px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
            >
              home
            </Link>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
