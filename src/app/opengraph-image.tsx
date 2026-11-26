import { ImageResponse } from "next/og";

export const alt = "Bench — the lab is dark. Someone's waiting.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#060a09",
          color: "#d9ffe9",
          padding: 80,
          fontFamily: "monospace",
          border: "16px solid #0e1a16",
        }}
      >
        <div style={{ color: "#7dffb3", fontSize: 26, letterSpacing: 8 }}>
          BENCH
        </div>
        <div style={{ fontSize: 86, marginTop: 30, lineHeight: 1.18 }}>
          THE LAB IS DARK.
        </div>
        <div style={{ color: "#7dffb3", fontSize: 44, marginTop: 10 }}>
          SOMEONE&apos;S WAITING.
        </div>
        <div style={{ color: "#6e9686", fontSize: 28, marginTop: 46 }}>
          Learn AI by doing. One quest at a time.
        </div>
      </div>
    ),
    { ...size },
  );
}
