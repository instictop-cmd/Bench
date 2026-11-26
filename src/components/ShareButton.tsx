"use client";

import { useState } from "react";

export function ShareButton({
  label = "Share your rank",
  text,
}: {
  label?: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url =
      typeof window !== "undefined" ? window.location.origin : "https://bench-sepia.vercel.app";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Bench", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled or clipboard blocked
    }
  }

  return (
    <button
      type="button"
      className="pixel-btn pixel-btn--ghost w-full"
      onClick={share}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
