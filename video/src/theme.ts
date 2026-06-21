// Greenroom design tokens — ported verbatim from app/globals.css so the video matches the product.
export const C = {
  canvas: "#ffffff",
  canvasTint: "#fafaf9",
  surface: "#f5f5f4",
  surfaceProduct: "#ffffff",
  ink: "#0c0c0d",
  inkSoft: "#2a2a2c",
  muted: "#6b7280",
  border: "#e7e7e4",
  borderStrong: "#d8d8d4",
  footer: "#0b0b0c",

  // The load-bearing "grounded" green — the one color that means something here.
  verified: "#1c8a4e",
  verifiedDeep: "#0f6b3a",
  verifiedSoft: "#eaf6ef",

  flag: "#d23b3b",
  flagMedium: "#b45309",
  flagSoft: "#fbecec",
  white: "#ffffff",
} as const;

export const SHADOW = {
  sm: "0 1px 2px rgba(12,12,13,0.04), 0 1px 1px rgba(12,12,13,0.03)",
  md: "0 2px 4px rgba(12,12,13,0.04), 0 6px 16px rgba(12,12,13,0.06)",
  lg: "0 4px 8px rgba(12,12,13,0.05), 0 16px 40px rgba(12,12,13,0.10)",
  accent: "0 8px 28px rgba(28,138,78,0.22)",
  accentLg: "0 18px 60px rgba(28,138,78,0.28)",
} as const;

// Band color for a 0–100 score — mirrors lib/scorecard.ts bandColor().
export const bandColor = (score: number): string =>
  score >= 75 ? C.verified : score >= 55 ? C.flagMedium : C.flag;

// Letter grade + verdict — mirrors lib/scorecard.ts gradeFor().
export function gradeFor(score: number): { grade: string; label: string; color: string } {
  const letters: [number, string][] = [
    [90, "A+"], [85, "A"], [80, "A−"], [75, "B+"], [70, "B"],
    [65, "B−"], [60, "C+"], [55, "C"], [50, "C−"], [0, "D"],
  ];
  const grade = letters.find(([min]) => score >= min)![1];
  const label = score >= 85 ? "Offer-ready" : score >= 75 ? "Solid" : score >= 55 ? "Developing" : "Not ready";
  return { grade, label, color: bandColor(score) };
}
