"use client";

import Link from "next/link";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { Signup } from "./Signup";
import { useProgress } from "@/lib/useProgress";
import { QUESTS, questsForRank } from "@/game/quests";
import { BOSSES, bossForRank } from "@/game/bosses";
import { FLOW_LESSONS } from "@/game/flow";
import { LOCKED_RANKS, RANKS } from "@/game/types";

export function Campus() {
  const progress = useProgress();
  const artifacts = [
    ...QUESTS.filter((quest) =>
      progress.artifacts.includes(quest.artifact.id),
    ).map((quest) => quest.artifact),
    ...FLOW_LESSONS.filter((lesson) =>
      progress.artifacts.includes(lesson.artifact.id),
    ).map((lesson) => lesson.artifact),
  ];
  const completedQuests = QUESTS.filter((quest) =>
    progress.completed.includes(quest.id),
  ).length;
  const flowDone = FLOW_LESSONS.filter((lesson) =>
    progress.completed.includes(lesson.id),
  ).length;
  const totalItems = QUESTS.length + FLOW_LESSONS.length;
  const completedItems = completedQuests + flowDone;
  const coreBosses = BOSSES.filter((boss) => boss.rank !== "tinkerer");
  const courseDone =
    completedQuests === QUESTS.length &&
    coreBosses.every((boss) => progress.completed.includes(boss.id));
  const workshopRank = RANKS.find((rank) => rank.id === "tinkerer");
  const workshopBoss = bossForRank("tinkerer");
  const workshopBossDone = workshopBoss
    ? progress.completed.includes(workshopBoss.id)
    : false;
  const workshopUnlocked = flowDone === FLOW_LESSONS.length;
  const workshopComplete = workshopUnlocked && workshopBossDone;

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
            Two rooms and the Workshop are open. Finish the core ranks, then
            keep building. Everything you make lands in your notebook.
          </p>

          <div className="mt-4 max-w-xs">
            <ShareButton
              label="Share the lab"
              text={`I'm at ${progress.xp} XP on Bench — a pixel lab for learning AI.`}
            />
          </div>

          {courseDone ? (
            <div className="mt-4 border-2 border-accent bg-accent/10 px-4 py-3">
              <p className="pxfont text-[9px] tracking-[0.16em] text-accent">
                CORE COURSE COMPLETE
              </p>
              <p className="termfont mt-2 text-[19px] text-ink">
                Two ranks, ten quests, two trials. The Workshop is open.
              </p>
              <Link
                href="/flow/fl-01"
                className="termfont mt-1 inline-block text-[16px] text-amber underline decoration-amber/40 underline-offset-4 hover:text-ink"
              >
                Enter the Workshop →
              </Link>
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
            {RANKS.filter((rank) => rank.id !== "tinkerer").map((rank) => {
              const quests = questsForRank(rank.id);
              const done = quests.filter((quest) =>
                progress.completed.includes(quest.id),
              ).length;
              const nextQuest = quests.find(
                (quest) => !progress.completed.includes(quest.id),
              );
              const boss = bossForRank(rank.id);
              const bossDone = boss
                ? progress.completed.includes(boss.id)
                : false;
              const bossUnlocked = done === quests.length;
              const rankComplete = bossUnlocked && bossDone;

              return (
                <section
                  key={rank.id}
                  className="pixel-panel pixel-panel--lit relative overflow-hidden"
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

                    <div className="hairline" />

                    <ol className="flex flex-col gap-2">
                      {quests.map((quest) => {
                        const complete = progress.completed.includes(quest.id);
                        const isNext = nextQuest?.id === quest.id;

                        return (
                          <li key={quest.id}>
                            <Link
                              href={`/quest/${quest.id}`}
                              className={`flex items-center justify-between gap-3 border-2 px-3 py-2 transition-colors ${
                                complete
                                  ? "border-edge bg-accent/5"
                                  : isNext
                                    ? "border-edge2 bg-black/20 hover:border-accent"
                                    : "border-edge bg-black/10 hover:border-edge2"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span
                                  className={`grid h-6 w-6 place-items-center border-2 pxfont text-[8px] ${
                                    complete
                                      ? "border-accent bg-accent text-[#04140d]"
                                      : "border-edge text-edge2"
                                  }`}
                                >
                                  {complete ? "✓" : quest.order}
                                </span>
                                <span className="termfont text-[18px] text-ink">
                                  {quest.title}
                                </span>
                              </span>
                              <span className="termfont text-[14px] text-dim">
                                +{quest.xp} xp
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>

                    {boss ? (
                      <div
                        className={`border-2 px-3 py-2 ${
                          bossDone
                            ? "border-accent bg-accent/10"
                            : bossUnlocked
                              ? "border-edge2 bg-black/20"
                              : "border-edge/60 bg-black/10 opacity-60"
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
                        ) : bossUnlocked ? (
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
                              {quests.length - done} quests left
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="termfont text-[15px] text-dim">
                        {done} / {quests.length} complete
                      </span>
                      {nextQuest ? (
                        <Link
                          href={`/quest/${nextQuest.id}`}
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
                      ) : rankComplete ? (
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="kicker">the workshop</p>
                <h2 className="pxfont mt-3 text-[15px] text-ink">
                  {workshopRank?.name} · {workshopRank?.verb}
                </h2>
                <p className="termfont mt-1 max-w-2xl text-[17px] text-dim">
                  Chain steps, carry a variable, handle a failure. No code.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="border-2 border-edge px-2 py-1 termfont text-[15px] text-amber">
                  flow
                </span>
                <span className="termfont text-[15px] text-dim">
                  {flowDone} / {FLOW_LESSONS.length}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {FLOW_LESSONS.map((lesson) => {
                const complete = progress.completed.includes(lesson.id);

                return (
                  <Link
                    key={lesson.id}
                    href={`/flow/${lesson.id}`}
                    className={`flex items-center justify-between gap-3 border-2 px-3 py-2 transition-colors ${
                      complete
                        ? "border-edge bg-accent/5"
                        : "border-edge2 bg-black/20 hover:border-accent"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`grid h-6 w-6 place-items-center border-2 pxfont text-[8px] ${
                          complete
                            ? "border-accent bg-accent text-[#04140d]"
                            : "border-edge text-edge2"
                        }`}
                      >
                        {complete ? "✓" : lesson.order}
                      </span>
                      <span className="termfont text-[18px] text-ink">
                        {lesson.title}
                      </span>
                    </span>
                    <span className="termfont text-[14px] text-dim">
                      +{lesson.xp} xp
                    </span>
                  </Link>
                );
              })}
            </div>
            {workshopBoss ? (
              <div
                className={`mt-2 border-2 px-3 py-2 ${
                  workshopBossDone
                    ? "border-accent bg-accent/10"
                    : workshopUnlocked
                      ? "border-edge2 bg-black/20"
                      : "border-edge/60 bg-black/10 opacity-60"
                }`}
              >
                {workshopBossDone ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="termfont text-[16px] text-accent">
                      boss passed · {workshopBoss.title}
                    </span>
                    <span className="pxfont text-[8px] text-accent">✓</span>
                  </div>
                ) : workshopUnlocked ? (
                  <Link
                    href={`/boss/${workshopBoss.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="termfont text-[16px] text-ink">
                      boss trial · {workshopBoss.title}
                    </span>
                    <span className="termfont text-[15px] text-amber">
                      enter →
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="termfont text-[16px] text-dim">
                      boss trial · {workshopBoss.title}
                    </span>
                    <span className="termfont text-[14px] text-edge2">
                      {FLOW_LESSONS.length - flowDone} lessons left
                    </span>
                  </div>
                )}
              </div>
            ) : null}
            <p className="termfont mt-2 text-[15px] text-edge2">
              {workshopComplete
                ? "Workshop complete · rank up."
                : "The Runaway is the last trial."}
            </p>
          </section>

          <section className="mt-8">
            <p className="kicker">notebook</p>
            <h2 className="pxfont mt-3 text-[13px] text-ink">What you keep</h2>
            {artifacts.length === 0 ? (
              <p className="termfont mt-2 text-[17px] text-dim">
                Empty. Every quest adds one reusable tool.
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
              One new quest a week
            </h2>
            <p className="termfont mt-2 text-[17px] text-dim">
              No spam. No account. Leave whenever.
            </p>
            <div className="mt-3 max-w-lg">
              <Signup />
            </div>
          </section>

          <section className="mt-8">
            <p className="kicker">still dark</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {LOCKED_RANKS.map((rank) => (
                <div
                  key={rank.name}
                  className="border-2 border-edge/60 bg-black/10 px-3 py-3 opacity-60"
                >
                  <p className="pxfont text-[9px] text-edge2">{rank.name}</p>
                  <p className="termfont mt-1 text-[16px] text-dim">
                    {rank.zone}
                  </p>
                  <p className="termfont text-[15px] text-edge2">
                    unlocks {rank.verb}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">
              {completedItems} of {totalItems} lessons complete
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
