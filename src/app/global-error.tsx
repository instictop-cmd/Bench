"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060a09",
          color: "#d9ffe9",
          fontFamily: "monospace",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            border: "2px solid #4f8a72",
            background: "#0a1210",
            padding: 28,
          }}
        >
          <p style={{ color: "#7dffb3", fontSize: 12, letterSpacing: 3 }}>
            BENCH
          </p>
          <h1 style={{ fontSize: 24, marginTop: 16 }}>SIGNAL LOST</h1>
          <p style={{ color: "#6e9686", fontSize: 18, lineHeight: 1.4 }}>
            Something broke on our side. Your progress is safe in this browser.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "12px 18px",
              background: "#7dffb3",
              color: "#04140d",
              border: 0,
              fontFamily: "monospace",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
