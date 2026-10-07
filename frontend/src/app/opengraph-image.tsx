import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0b1120 0%, #111827 35%, #0f172a 100%)",
          color: "white",
          fontFamily: '"Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 20,
            letterSpacing: 3,
            opacity: 0.8,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            S
          </div>
          PromptShield
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 420,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(148, 163, 184, 0.12)",
              border: "1px solid rgba(148, 163, 184, 0.24)",
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            AI Security
          </div>

          <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1, letterSpacing: -4 }}>
            Prompt → Analysis → Decision → Response
          </div>

          <div style={{ fontSize: 26, opacity: 0.8, maxWidth: 760, lineHeight: 1.3 }}>
            Detect prompt injection, explain risk, and enforce allow, warn, sanitize, and block decisions before prompts reach your model.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, fontSize: 20, opacity: 0.72 }}>
          <div>ALLOW</div>
          <div>WARN</div>
          <div>SANITIZE</div>
          <div>BLOCK</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
