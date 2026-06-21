// Same three faces the product uses: Inter (body), Manrope 700 (display), IBM Plex Mono (evidence).
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexMono";

const inter = loadInter("normal", { weights: ["400", "500", "600"] });
const manrope = loadManrope("normal", { weights: ["700"] });
const plex = loadPlex("normal", { weights: ["400", "500"] });

export const FONT = {
  sans: inter.fontFamily,
  // Manrope display face: tight tracking applied per-use (letterSpacing: -0.04em).
  display: manrope.fontFamily,
  mono: plex.fontFamily,
};

export const waitForFonts = () =>
  Promise.all([inter.waitUntilDone(), manrope.waitUntilDone(), plex.waitUntilDone()]);
