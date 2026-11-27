"use client";

import Link from "next/link";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { Signup } from "./Signup";
import { useProgress } from "@/lib/useProgress";
import {
  allCourseItems,
  completedArtifacts,
  courseDone,
  courseForRank,
  courseTotals,
  nextCourseItem,
  rankBoss,
  rankComplete,
  rankUnlocked,
  unlockReason,
} from "@/game/course";
import { RANKS } from "@/game/types";

export function Campus() {
  const progress = useProgress();
  const artifacts = completedArtifacts(progress.completed);
  const totals = courseTotals();
  const completedItems = allCourseItems().filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const bossesDone = RANKS.filter((rank) => {
    const boss = rankBoss(rank.id);
    return boss ? progress.completed.includes(boss.id) : false;
  }).length;
  const allDone = courseDone(progress.completed);
  const coreDone = RANKS.slice(0, 2).every((rank) =>
    rankComplete(rank.id, progress.completed),
  );
  const openRank = RANKS.map((rank) => ({
    rank,
    unlocked: rankUnlocked(rank.id, progress.completed),
    complete: rankComplete(rank.id, progress.completed),
  })).find((entry) => entry.unlocked && !entry.complete);

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
            >
              BENCH
            </Link>
            <span className="termfont text-[15px] text-dim">the campus</span>
          </div>
          <span className="termfont text-[15px] text-dim">
            {progress.xp} xp
          </span>
        </header>

        <main className="flex-1 py-8">
          <p className="kicker">your lab</p>
          <h1 className="pxfont mt-4 text-[22px] leading-[1.5] text-ink sm:text-[28px]">
            THE CAMPUS
          </h1>
          <p className="termfont mt-3 max-w-2xl text-[20px] leading-[1.35] text-dim">
            Six rooms, one course. Start in the Library and finish on the
            Rooftop. Every lesson adds something to your notebook.
          </p>

          <div className="mt-4 max-w-xs">
            <ShareButton
              label="Share the lab"
              text={`I'm at ${progress.xp} XP on Bench — a pixel lab for learning AI.`}
            />
          </div>

          {allDone ? (
            <div className="mt-4 border-2 border-accent bg-accent/10 px-4 py-3">
              <p className="pxfont text-[9px] tracking-[0.16em] text-accent">
                COURSE COMPLETE
              </p>
              <p className="termfont mt-2 text-[19px] text-ink">
                Six ranks, {totals.lessons} lessons, {totals.bosses} trials.
                You can build, measure, and ship.
              </p>
              <Link
                href="/play"
                className="termfont mt-1 inline-block text-[16px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
              >
                Replay the prologue →
              </Link>
            </div>
          ) : coreDone ? (
            <div className="mt-4 border-2 border-accent bg-accent/10 px-4 py-3">
              <p className="pxfont text-[9px] tracking-[0.16em] text-accent">
                CORE COURSE COMPLETE
              </p>
              <p className="termfont mt-2 text-[19px] text-ink">
                Two ranks down. Four rooms to go.
              </p>
              {openRank ? (
                <Link
                  href={
                    nextCourseItem(openRank.rank.id, progress.completed)
                      ?.href ?? "/campus"
                  }
                  className="termfont mt-1 inline-block text-[16px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
                >
                  Enter {openRank.rank.zone} →
                </Link>
              ) : null}
            </div>
          ) : null}

          {progress.completed.length === 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-2 border-edge2 bg-accent/10 px-4 py-3">
              <span className="termfont text-[17px] text-ink">
                New here? Start in the basement.
              </span>
              <Link href="/play" className="pixel-btn">
                The prologue
              </Link>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {RANKS.map((rank) => {
              const items = courseForRank(rank.id);
              const done = items.filter((item) =>
                progress.completed.includes(item.id),
              ).length;
              const next = nextCourseItem(rank.id, progress.completed);
              const boss = rankBoss(rank.id);
              const bossDone = boss
                ? progress.completed.includes(boss.id)
                : false;
              const bossUnlocked = items.length > 0 && done === items.length;
              const unlocked = rankUnlocked(rank.id, progress.completed);
              const complete = rankComplete(rank.id, progress.completed);
              const reason = unlockReason(rank.id);

              return (
                <section
                  key={rank.id}
                  className={`pixel-panel relative overflow-hidden ${
                    unlocked ? "pixel-panel--lit" : "opacity-60"
                  }`}
                >
                  <div className="scene-grid pointer-events-none absolute inset-0 opacity-30" />
                  <div className="relative flex flex-col gap-4 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="kicker">{rank.zone}</p>
                        <h2 className="pxfont mt-2 text-[15px] leading-[1.6] text-ink">
                          {rank.name}
                        </h2>
                        <p className="termfont mt-1 text-[16px] text-dim">
                          {rank.blurb}
                        </p>
                      </div>
                      <span className="border-2 border-edge px-2 py-1 termfont text-[15px] text-amber">
                        {rank.verb}
                      </span>
                    </div>

                    {!unlocked ? (
                      <p className="termfont border-2 border-edge/60 bg-black/10 px-3 py-2 text-[15px] text-edge2">
                        locked · {reason}
                      </p>
                    ) : null}

                    <div className="hairline" />

                    <ol className="flex flex-col gap-2">
                      {items.map((item) => {
                        const itemDone = progress.completed.includes(item.id);
                        const isNext = next?.id === item.id;

                        const body = (
                          <>
                            <span className="flex items-center gap-3">
                              <span
                                className={`grid h-6 w-6 place-items-center border-2 pxfont text-[8px] ${
                                  itemDone
                                    ? "border-accent bg-accent text-[#04140d]"
                                    : "border-edge text-edge2"
                                }`}
                              >
                                {itemDone ? "✓" : item.order}
                              </span>
                              <span className="termfont text-[18px] text-ink">
                                {item.title}
                              </span>
                            </span>
                            <span className="termfont text-[14px] text-dim">
                              +{item.xp} xp
                            </span>
                          </>
                        );

                        return (
                          <li key={item.id}>
                            {unlocked ? (
                              <Link
                                href={item.href}
                                className={`flex items-center justify-between gap-3 border-2 px-3 py-2 transition-colors ${
                                  itemDone
                                    ? "border-edge bg-accent/5"
                                    : isNext
                                      ? "border-edge2 bg-black/20 hover:border-accent"
                                      : "border-edge bg-black/10 hover:border-edge2"
                                }`}
                              >
                                {body}
                              </Link>
                            ) : (
                              <div className="flex items-center justify-between gap-3 border-2 border-edge/60 bg-black/10 px-3 py-2">
                                {body}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {boss ? (
                      <div
                        className={`border-2 px-3 py-2 ${
                          bossDone
                            ? "border-accent bg-accent/10"
                            : bossUnlocked && unlocked
                              ? "border-edge2 bg-black/20"
                              : "border-edge/60 bg-black/10 opacity-70"
                        }`}
                      >
                        {bossDone ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="termfont text-[16px] text-accent">
                              boss passed · {boss.title}
                            </span>
                            <span className="pxfont text-[8px] text-accent">
                              ✓
                            </span>
                          </div>
                        ) : bossUnlocked && unlocked ? (
                          <Link
                            href={`/boss/${boss.id}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="termfont text-[16px] text-ink">
                              boss trial · {boss.title}
                            </span>
                            <span className="termfont text-[15px] text-amber">
                              enter →
                            </span>
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <span className="termfont text-[16px] text-dim">
                              boss trial · {boss.title}
                            </span>
                            <span className="termfont text-[14px] text-edge2">
                              {unlocked
                                ? `${items.length - done} lessons left`
                                : "locked"}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="termfont text-[15px] text-dim">
                        {done} / {items.length} complete
                      </span>
                      {!unlocked ? (
                        <span className="termfont text-[15px] text-edge2">
                          locked
                        </span>
                      ) : next ? (
                        <Link
                          href={next.href}
                          className="termfont text-[15px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
                        >
                          continue →
                        </Link>
                      ) : boss && bossUnlocked && !bossDone ? (
                        <Link
                          href={`/boss/${boss.id}`}
                          className="termfont text-[15px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
                        >
                          boss trial →
                        </Link>
                      ) : complete ? (
                        <span className="termfont text-[15px] text-accent">
                          rank complete
                        </span>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-8">
            <p className="kicker">notebook</p>
            <h2 className="pxfont mt-3 text-[13px] text-ink">What you keep</h2>
            {artifacts.length === 0 ? (
              <p className="termfont mt-2 text-[17px] text-dim">
                Empty. Every lesson adds one reusable tool.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="border-2 border-edge bg-black/20 px-3 py-2"
                  >
                    <p className="termfont text-[18px] text-ink">
                      {artifact.name}
                    </p>
                    <p className="termfont text-[15px] text-dim">
                      {artifact.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <p className="kicker">stay in the loop</p>
            <h2 className="pxfont mt-3 text-[13px] text-ink">
              One new lesson a week
            </h2>
            <p className="termfont mt-2 text-[17px] text-dim">
              No spam. No account. Leave whenever.
            </p>
            <div className="mt-3 max-w-lg">
              <Signup />
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">
              {completedItems} of {totals.lessons} lessons complete ·{" "}
              {bossesDone} of {totals.bosses} bosses
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
