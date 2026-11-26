import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "./LegalLinks";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <Link
            href="/"
            className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
          >
            BENCH
          </Link>
          <Link
            href="/"
            className="termfont text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
          >
            back to the lab
          </Link>
        </header>

        <main className="flex-1 py-8">
          <p className="kicker">bench · legal</p>
          <h1 className="pxfont mt-4 text-[18px] leading-[1.6] text-ink sm:text-[22px]">
            {title}
          </h1>
          <p className="termfont mt-2 text-[15px] text-dim">
            last updated: {updated}
          </p>

          <div className="legal-prose mt-8 flex flex-col gap-5">{children}</div>
        </main>

        <footer className="border-t-2 border-edge/60 pt-4">
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="pxfont text-[10px] leading-[1.7] text-accent sm:text-[11px]">
        {heading}
      </h2>
      <div className="termfont text-[19px] leading-[1.4] text-ink/90">
        {children}
      </div>
    </section>
  );
}
