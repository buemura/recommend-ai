import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "RecommendAI - Descubra o que assistir, ouvir ou fazer hoje com ajuda da IA!";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        position: "relative",
      }}
    >
      {/* Decorative gradient circles */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          borderRadius: 18,
          background: "linear-gradient(135deg, #6366F1, #EC4899)",
          marginBottom: 24,
          fontSize: 40,
        }}
      >
        ✦
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          background: "linear-gradient(90deg, #818cf8, #c084fc, #f472b6)",
          backgroundClip: "text",
          color: "transparent",
          display: "flex",
          letterSpacing: -2,
        }}
      >
        RecommendAI
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          marginTop: 16,
          textAlign: "center",
          maxWidth: 700,
          display: "flex",
        }}
      >
        Descubra o que assistir, ouvir ou fazer hoje com ajuda da IA!
      </div>

      {/* Tags */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 40,
        }}
      >
        {["Filmes", "Séries", "Músicas", "Entretenimento"].map((tag) => (
          <div
            key={tag}
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.3)",
              color: "#cbd5e1",
              fontSize: 18,
              display: "flex",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
