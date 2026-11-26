"use client";

import { useEffect, useState, type ReactNode } from "react";

type DialogueProps = {
  text: string;
  awake?: boolean;
  children?: ReactNode;
  speed?: number;
  onDone?: () => void;
};

function useTypewriter(text: string, speed: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) return;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);

    return () => window.clearInterval(id);
  }, [text, speed]);

  return {
    shown: text.slice(0, count),
    done: count >= text.length,
    skip: () => setCount(text.length),
  };
}

export function Dialogue({
  text,
  awake = true,
  children,
  speed = 18,
  onDone,
}: DialogueProps) {
  const { shown, done, skip } = useTypewriter(text, speed);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${awake ? "status-dot--on" : ""}`} />
          <span className="pxfont text-[9px] tracking-[0.18em] text-dim">
            PIP
          </span>
          <span className="termfont text-[15px] text-edge2">
            {awake ? "online" : "dormant"}
          </span>
        </div>
        {!done && text ? (
          <button
            type="button"
            onClick={skip}
            className="termfont text-[14px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
          >
            skip
          </button>
        ) : null}
      </div>

      <div
        className="min-h-[92px] cursor-pointer"
        onClick={done ? undefined : skip}
        role="presentation"
      >
        <p className="termfont whitespace-pre-line text-[21px] leading-[1.35] text-ink">
          {shown}
          {!done ? <span className="term-caret ml-1 align-baseline" /> : null}
        </p>
      </div>

      <div className="min-h-[44px]">{done ? children : null}</div>
    </div>
  );
}
