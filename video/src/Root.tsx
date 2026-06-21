import React from "react";
import { Composition } from "remotion";
import timings from "./timings.json";
import { GreenroomVideo } from "./Video";
import { waitForFonts } from "./fonts";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Greenroom"
      component={GreenroomVideo}
      durationInFrames={timings.totalFrames}
      fps={timings.fps}
      width={timings.width}
      height={timings.height}
      // Ensure web fonts are ready before the first frame renders.
      calculateMetadata={async () => {
        await waitForFonts();
        return {};
      }}
    />
  );
};
