import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import {
  SCENES,
  SCENE_FRAMES,
  SCENE_STARTS,
  INTRO_FRAMES,
  MAIN_FRAMES,
  OUTRO_FRAMES,
} from "./scenes";
import { Bg, BrowserFrame, Caption, Intro, Outro, LogoBug } from "./components";

export const VibeDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07070d" }}>
      {/* Authentic Strudel soundtrack, rendered offline by the strudel-cli
          synth (strudel-cli/scripts/render-soundtrack.mjs) — one pattern per
          scene, laid out to this film's exact timing. */}
      <Audio src={staticFile("soundtrack.wav")} />

      <Bg />

      <Sequence durationInFrames={INTRO_FRAMES} layout="none">
        <Intro />
      </Sequence>

      {SCENES.map((scene, i) => (
        <Sequence
          key={scene.clip}
          from={SCENE_STARTS[i]}
          durationInFrames={SCENE_FRAMES[i]}
          layout="none"
        >
          <LogoBug />
          <BrowserFrame clip={scene.clip} />
          <Caption scene={scene} />
        </Sequence>
      ))}

      <Sequence
        from={INTRO_FRAMES + MAIN_FRAMES}
        durationInFrames={OUTRO_FRAMES}
        layout="none"
      >
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
