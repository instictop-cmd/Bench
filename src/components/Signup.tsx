"use client";

import { useState, type FormEvent } from "react";

export function Signup() {
  const endpoint = process.env.NEXT_PUBLIC_SIGNUP_URL;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  if (!endpoint) {
    return (
      <p className="termfont text-[17px] text-dim">
        Want the next quest by email?{" "}
        <a
          className="text-amber underline decoration-amber/40 underline-offset-4"
          href="mailto:instictop@gmail.com?subject=Bench%20beta"
        >
          Join the beta list
        </a>
        .
      </p>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) return;

    try {
      await fetch(endpoint as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "bench" }),
      });
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@college.edu"
        aria-label="Email address"
        className="termfont min-w-0 flex-1 border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
      />
      <button type="submit" className="pixel-btn shrink-0">
        {status === "sent" ? "You're in" : "Get quests"}
      </button>
      {status === "error" ? (
        <p className="termfont text-[15px] text-red">
          Could not save that. Try again.
        </p>
      ) : null}
    </form>
  );
}
