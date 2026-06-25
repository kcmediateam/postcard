import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Radiate — tracked direct mail for local marketing";
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
          padding: "84px",
          color: "#ffffff",
          backgroundColor: "#100F38",
          backgroundImage:
            "radial-gradient(120% 130% at 14% 86%, #2A2483 0%, #211C66 34%, #100F38 72%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Signal rings, lower-left */}
        {[260, 460, 680].map((d) => (
          <div
            key={d}
            style={{
              position: "absolute",
              left: 168 - d / 2,
              top: 545 - d / 2,
              width: d,
              height: d,
              borderRadius: d,
              border: "2px solid #FF8A4C",
              opacity: 0.18,
              display: "flex",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 537,
            width: 18,
            height: 18,
            borderRadius: 18,
            backgroundColor: "#FFC23D",
            display: "flex",
          }}
        />

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 14,
              backgroundColor: "#FFB02E",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
            Radiate
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 34,
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -2,
            maxWidth: 900,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          The mail that&nbsp;<span style={{ color: "#FFC836" }}>reaches every door.</span>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "rgba(255,255,255,0.8)",
            maxWidth: 760,
            display: "flex",
          }}
        >
          Tracked direct mail for local marketing — no minimums, no markup.
        </div>
      </div>
    ),
    { ...size }
  );
}
