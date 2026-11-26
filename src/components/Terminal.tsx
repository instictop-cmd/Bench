"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type TLine = {
  kind: "sys" | "in" | "out" | "err";
  text: string;
};

const kindClass: Record<TLine["kind"], string> = {
  sys: "term-sys",
  in: "term-in",
  out: "term-out",
  err: "term-err",
};

type TerminalProps = {
  lines: TLine[];
  busy?: boolean;
  idle?: boolean;
  streaming?: string;
  footer?: ReactNode;
  className?: string;
};

export function Terminal({
  lines,
  busy = false,
  idle = false,
  streaming = "",
  footer,
  className = "",
}: TerminalProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, busy, streaming]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div
        ref={scroller}
        className="term min-h-[210px] flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
        aria-live="polite"
      >
        {lines.map((line, i) => (
          <div key={`${i}-${line.text}`} className={`term-line ${kindClass[line.kind]}`}>
            {line.kind === "in" ? <span className="term-prefix">&gt; </span> : null}
            {line.text}
          </div>
        ))}

        {streaming ? (
          <div className="term-line term-out">
            {streaming}
            <span className="term-caret ml-1" />
          </div>
        ) : null}

        {busy && !streaming ? (
          <div className="term-line">
            <span className="term-caret" />
          </div>
        ) : null}

        {idle && !busy ? (
          <div className="term-line">
            <span className="term-prefix">&gt; </span>
            <span className="term-caret" />
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">{footer}</div>
      ) : null}
    </div>
  );
}
