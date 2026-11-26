"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import type { Boss, BossClaim, BossOption } from "@/game/bosses";
import { RANKS } from "@/game/types";

export function BossPlayer({ boss }: { boss: Boss }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const progress = useProgress();
  const rank = RANKS.find((item) => item.id === boss.rank);
  const round = boss.rounds[roundIndex];
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    track("boss_start", { boss: boss.id });
    return () => {
      alive.current = false;
    };
  }, [boss.id]);

  const passed = done && score >= boss.pass;

  function pick(id: string, correct: boolean) {
    if (revealed) return;
    setPicked(id);
    setRevealed(true);
    if (correct) setScore((value) => value + 1);
  }

  function next() {
    if (roundIndex + 1 >= boss.rounds.length) {
      const finalScore = score;
      const didPass = finalScore >= boss.pass;
      setDone(true);
      if (didPass) {
        const fresh = completeQuest(boss.id, boss.xp, boss.artifact.id);
        setAwarded(fresh);
        track("boss_complete", { boss: boss.id, score: finalScore });
      } else {
        track("boss_fail", { boss: boss.id, score: finalScore });
      }
      return;
    }
    setRoundIndex((value) => value + 1);
    setPicked(null);
    setRevealed(false);
  }

  function retry() {
    setRoundIndex(0);
    setScore(0);
    setPicked(null);
    setRevealed(false);
    setDone(false);
    setAwarded(false);
  }

  const selectedClaim = round.claims?.find((claim) => claim.id === picked);
  const selectedOption = round.options?.find((option) => option.id === picked);
  const pickedCorrect = selectedClaim?.fake ?? selectedOption?.correct ?? false;

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/campus"
              className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
            >
              BENCH
            </Link>
            <span className="termfont text-[15px] text-dim">
              boss trial · {rank?.name.toLowerCase()}
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">{progress.xp} xp</span>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6 lg:py-6">
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-35" />
            <div className="relative flex h-full flex-col gap-4 p-4 sm:p-5">
              <div>
                <p className="kicker">boss trial · {rank?.zone.toLowerCase()}</p>
                <h1 className="pxfont mt-3 text-[17px] leading-[1.6] text-ink sm:text-[19px]">
                  {boss.title}
                </h1>
                <p className="termfont mt-3 text-[19px] leading-[1.35] text-dim">
                  {boss.goal}
                </p>
              </div>

              <div className="hairline" />

              <div className="flex items-center justify-between gap-2">
                {boss.rounds.map((item, index) => (
                  <span
                    key={item.id}
                    className={`h-2 flex-1 ${
                      index < roundIndex ? "bg-accent" : "bg-edge"
                    }`}
                  />
                ))}
              </div>

              <div className="border-2 border-edge2 bg-black/25 px-3 py-3">
                <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                  {round.title}
                </p>
                <p className="termfont mt-2 text-[18px] leading-[1.35] text-ink">
                  {round.prompt}
                </p>
              </div>

              <div className="mt-auto border-2 border-edge bg-black/20 px-3 py-2.5">
                <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                  passed rounds
                </p>
                <p className="termfont mt-1 text-[19px] text-ink">
                  {score} / {boss.rounds.length}
                </p>
                <p className="termfont text-[15px] text-dim">
                  pass mark: {boss.pass} / {boss.rounds.length}
                </p>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[520px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                TRIAL
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                {boss.scene}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              {!done && round.claims ? (
                <>
                  <p className="termfont text-[17px] text-dim">
                    Tap the claim with no traceable source.
                  </p>
                  {round.claims.map((claim: BossClaim) => {
                    const isPicked = picked === claim.id;
                    const state = revealed
                      ? claim.fake
                        ? "border-accent bg-accent/10"
                        : isPicked
                          ? "border-red bg-red/10"
                          : "border-edge opacity-60"
                      : "border-edge hover:border-edge2";
                    return (
                      <button
                        key={claim.id}
                        type="button"
                        onClick={() => pick(claim.id, claim.fake)}
                        className={`border-2 px-3 py-2 text-left termfont text-[18px] leading-[1.3] text-ink ${state}`}
                      >
                        {claim.text}
                      </button>
                    );
                  })}
                </>
              ) : null}

              {!done && round.options ? (
                <>
                  <p className="termfont text-[17px] text-dim">
                    Which question adds what is missing?
                  </p>
                  {round.options.map((option: BossOption) => {
                    const isPicked = picked === option.id;
                    const state = revealed
                      ? option.correct
                        ? "border-accent bg-accent/10"
                        : isPicked
                          ? "border-red bg-red/10"
                          : "border-edge opacity-60"
                      : "border-edge hover:border-edge2";
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => pick(option.id, option.correct)}
                        className={`border-2 px-3 py-2 text-left termfont text-[18px] leading-[1.3] text-ink ${state}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </>
              ) : null}

              {revealed ? (
                <div
                  className={`border-2 px-3 py-3 ${
                    pickedCorrect
                      ? "border-edge2 bg-accent/10"
                      : "border-red/60 bg-red/5"
                  }`}
                >
                  <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                    {pickedCorrect ? "CAUGHT" : "ESCAPED"}
                  </p>
                  <p className="termfont mt-2 text-[17px] leading-[1.35] text-ink">
                    {selectedClaim?.note ??
                      selectedOption?.feedback ??
                      "Read the card again."}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {revealed && !done ? (
                <button type="button" className="pixel-btn w-full" onClick={next}>
                  {roundIndex + 1 >= boss.rounds.length
                    ? "Finish the trial"
                    : "Next round"}
                </button>
              ) : null}

              {done ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {passed
                        ? awarded
                          ? "rank up · new xp"
                          : "already completed"
                        : "trial failed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      {score} / {boss.rounds.length}
                    </span>
                  </div>
                  {passed ? (
                    <Link
                      href={boss.rank === "operator" ? "/quest/an-01" : "/campus"}
                      className="pixel-btn w-full"
                    >
                      {boss.rank === "operator"
                        ? "Enter the Archive →"
                        : "Back to campus"}
                    </Link>
                  ) : (
                    <button type="button" className="pixel-btn w-full" onClick={retry}>
                      Try the trial again
                    </button>
                  )}
                  {passed ? (
                    <ShareButton
                      label="Share the rank"
                      text={`I passed ${boss.title} on Bench — a pixel lab for learning AI.`}
                    />
                  ) : null}
                  <Link
                    href="/campus"
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    back to campus
                  </Link>
                </div>
              ) : null}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">{boss.goal}</span>
            <span className="termfont text-[14px] text-edge2">
              +{boss.xp} xp
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
