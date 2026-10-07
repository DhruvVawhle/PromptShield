import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="PromptShield mark"
        >
          <path
            d="M16 2.5L25.5 6.5V14.5C25.5 21.2 21.3 27.2 16 29.5C10.7 27.2 6.5 21.2 6.5 14.5V6.5L16 2.5Z"
            fill="url(#shieldFill)"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.2"
          />
          <path d="M12 15.7L14.8 18.5L20.5 12.8" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="shieldFill" x1="6.5" y1="2.5" x2="25.5" y2="29.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FAFC" stopOpacity="0.92" />
              <stop offset="1" stopColor="#CBD5E1" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
