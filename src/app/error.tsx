"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
        <div className="pixel-panel pixel-panel--lit w-full p-6 sm:p-8">
          <p className="kicker">bench · error</p>
          <h1 className="pxfont mt-4 text-[18px] leading-[1.6] text-ink">
            SIGNAL LOST
          </h1>
          <p className="termfont mt-4 text-[20px] leading-[1.35] text-dim">
            Something broke on our side. Your progress is safe in this browser.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="pixel-btn" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="pixel-btn pixel-btn--ghost">
              Back to the lab
            </Link>
          </div>
          <p className="termfont mt-6 text-[15px] text-edge2">
            Still broken?{" "}
            <a
              className="text-amber underline decoration-amber/40 underline-offset-4"
              href="mailto:instictop@gmail.com"
            >
              report it
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
