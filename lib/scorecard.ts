// Capability scorecard helpers — ISOMORPHIC (no Node APIs), safe in a client component.
// The post-call debrief produces per-dimension scores; this module turns them into the
// hero readout: a weighted readiness number, a letter grade, and the display metadata
// (labels, axis labels, band colors) the scorecard + radar render from.

import type { Dimension, DimensionKey } from './types';

/** Full display label for a dimension (capability rows). */
export const DIM_LABEL: Record<DimensionKey, string> = {
  grounding: 'Grounding',
  technical: 'Technical depth',
  communication: 'Communication',
  composure: 'Composure',
  structure: 'Structure',
};

/** Short axis label for the radar (where space is tight). */
export const DIM_SHORT: Record<DimensionKey, string> = {
  grounding: 'Grounding',
  technical: 'Technical',
  communication: 'Comms',
  composure: 'Composure',
  structure: 'Structure',
};

/** One-line "what this measures" blurb (capability section subtext). */
export const DIM_BLURB: Record<DimensionKey, string> = {
  grounding: 'Did your facts survive Cala’s cited data',
  technical: 'Depth and correctness of your reasoning',
  communication: 'Clarity, concision, signal over noise',
  composure: 'How you held up when the MD pushed back',
  structure: 'Logical flow and framing of the pitch',
};

// Grounding is the differentiator on grounded tracks, so it carries double weight; the
// rest are equal. For ungrounded tracks (no grounding dim) this is a simple mean.
const WEIGHT: Record<DimensionKey, number> = {
  grounding: 2,
  technical: 1,
  communication: 1,
  composure: 1,
  structure: 1,
};

/** Weighted overall "readiness" score, 0–100. */
export function readinessScore(dims: Dimension[]): number {
  if (!dims.length) return 0;
  let num = 0;
  let den = 0;
  for (const d of dims) {
    const w = WEIGHT[d.key] ?? 1;
    num += d.score * w;
    den += w;
  }
  return Math.round(num / Math.max(1, den));
}

/** Band color for a 0–100 score — the one place the green/amber/red thresholds live. */
export function bandColor(score: number): string {
  return score >= 75 ? 'var(--verified)' : score >= 55 ? 'var(--flag-medium)' : 'var(--flag)';
}

/** Map a readiness score to a letter grade + a plain-language verdict label. The letter is
 *  fine-grained (every 5 pts); the verdict WORD and color are both keyed off the same 75/55
 *  band thresholds (plus one split inside green) so a label never renders in two colors —
 *  i.e. "Solid" is always green, "Developing" always amber, "Not ready" always red. */
export function gradeFor(score: number): { grade: string; label: string; color: string } {
  const letters: [number, string][] = [
    [90, 'A+'], [85, 'A'], [80, 'A−'], [75, 'B+'], [70, 'B'],
    [65, 'B−'], [60, 'C+'], [55, 'C'], [50, 'C−'], [0, 'D'],
  ];
  const [, grade] = letters.find(([min]) => score >= min)!;
  const label = score >= 85 ? 'Offer-ready' : score >= 75 ? 'Solid' : score >= 55 ? 'Developing' : 'Not ready';
  return { grade, label, color: bandColor(score) };
}
