import Link from "next/link";
import { PipSprite } from "@/components/PipSprite";
import { ProgressStrip } from "@/components/ProgressStrip";
import { LegalLinks } from "@/components/LegalLinks";

export default function Home() {
  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <span className="pxfont text-[11px] tracking-[0.14em] text-accent">
              BENCH
            </span>
            <span className="termfont text-[15px] text-dim">
              a lab for learning AI by doing
            </span>
          </div>
          <Link
            href="/play"
            className="termfont text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
          >
            prologue
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:py-10">
          <section>
            <p className="kicker">a pixel lab · no setup · no account</p>

            <h1 className="pxfont mt-5 text-[26px] leading-[1.55] text-ink sm:text-[34px] lg:text-[40px]">
              THE LAB
              <br />
              IS DARK.
            </h1>
            <p className="pxfont mt-2 text-[14px] leading-[1.7] text-accent sm:text-[17px] lg:text-[19px]">
              SOMEONE&apos;S WAITING.
            </p>

            <p className="termfont mt-6 max-w-xl text-[20px] leading-[1.4] text-dim">
              Learn to actually use AI — not by watching tutorials, but by
              waking up a small machine in a basement and teaching it what you
              know. One quest at a time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/play" className="pixel-btn">
                Enter the basement →
              </Link>
              <Link href="/quest/op-01" className="pixel-btn pixel-btn--ghost">
                I&apos;ve used AI before
              </Link>
            </div>

            <p className="termfont mt-4 text-[15px] text-edge2">
              4 minutes · complete beginner · works on your phone
            </p>

            <ProgressStrip />
          </section>

          <section className="pixel-panel pixel-panel--lit relative order-first overflow-hidden lg:order-last">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-70" />
            <div className="scene-floor pointer-events-none absolute inset-x-0 bottom-0 h-2/5" />

            <div className="relative flex min-h-[270px] flex-col p-5 sm:min-h-[400px]">
              <div className="flex items-center justify-between">
                <span className="kicker">scene 00 · downstairs</span>
                <span className="termfont text-[14px] text-edge2">
                  lights: off
                </span>
              </div>

              <div className="relative flex flex-1 flex-col items-center justify-center py-5 sm:py-10">
                <div
                  className="absolute h-28 w-48 rounded-full bg-accent/5 blur-2xl"
                  aria-hidden
                />
                <div className="pip-float relative w-24 sm:w-40">
                  <PipSprite title="Pip, a small dormant pixel robot" />
                </div>
                <div
                  className="mt-3 h-2 w-20 rounded-full bg-accent/10 blur-[2px]"
                  aria-hidden
                />
              </div>

              <div className="relative mx-auto max-w-[280px] border-2 border-edge bg-panel2 px-3 py-2 text-center">
                <p className="termfont text-[18px] leading-tight text-dim">
                  …is someone there?
                </p>
                <div className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-edge bg-panel2" />
              </div>
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-3 border-t-2 border-edge/60 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 termfont text-[15px] text-edge2">
              <span>Operator</span>
              <span aria-hidden>→</span>
              <span>Analyst</span>
              <span aria-hidden>→</span>
              <span>Tinkerer</span>
              <span aria-hidden>→</span>
              <span>Integrator</span>
              <span aria-hidden>→</span>
              <span>Engineer</span>
              <span aria-hidden>→</span>
              <span>Architect</span>
              <span aria-hidden>→</span>
              <span>Connector</span>
              <span aria-hidden>→</span>
              <span>Caller</span>
              <span aria-hidden>→</span>
              <span>Pilot</span>
            </div>
            <span className="termfont text-[14px] text-edge2">v0.1</span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
