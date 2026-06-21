// Master timeline — places each scene back-to-back (manual fades inside each scene keep audio in
// perfect sync) and plays its voiceover, delayed by the scene's head-pad.
import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import timings from "./timings.json";
import { C } from "./theme";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneDemo } from "./scenes/SceneDemo";
import { SceneDebrief } from "./scenes/SceneDebrief";
import { SceneClose } from "./scenes/SceneClose";

const COMPONENTS: Record<string, React.FC<{ durationInFrames: number }>> = {
  problem: SceneProblem,
  intro: SceneIntro,
  demo: SceneDemo,
  debrief: SceneDebrief,
  close: SceneClose,
};

export const GreenroomVideo: React.FC = () => {
  let offset = 0;
  return (
    <AbsoluteFill style={{ background: C.footer }}>
      {timings.scenes.map((s) => {
        const Comp = COMPONENTS[s.id];
        const from = offset;
        offset += s.durationInFrames;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.durationInFrames} name={s.id}>
            <Comp durationInFrames={s.durationInFrames} />
            {s.audio && (
              <Sequence from={s.audioStartFrame} name={`${s.id}-vo`}>
                <Audio src={staticFile(s.audio)} />
              </Sequence>
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
