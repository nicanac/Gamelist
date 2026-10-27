import { ImageResponse } from "next/og";
import { getLibrary } from "@/lib/library";
import { computeStats } from "@/lib/stats";

export const alt = "Game Library: every game played, playing and up next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const stats = computeStats((await getLibrary()).games);
  const figures = [
    { value: stats.finished, label: "played" },
    { value: stats.playing, label: "playing" },
    { value: stats.upNext, label: "up next" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f2f1ee",
          background:
            "radial-gradient(circle at 15% 25%, rgba(107,84,255,0.55), transparent 45%), radial-gradient(circle at 90% 90%, rgba(232,87,154,0.45), transparent 50%), #08080c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, letterSpacing: 6 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #9085e9, #e87ba4 55%, #f6b26b)",
            }}
          />
          GAME LIBRARY
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 112, fontWeight: 800, lineHeight: 0.95 }}>
          <span>{stats.total} games.</span>
          <span style={{ color: "#c3c2b7" }}>One library.</span>
        </div>
        <div style={{ display: "flex", gap: 56, fontSize: 30, color: "#c3c2b7" }}>
          {figures.map((figure) => (
            <div key={figure.label} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
              <span style={{ fontSize: 44, fontWeight: 700, color: "#f2f1ee" }}>{figure.value}</span>
              {figure.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
