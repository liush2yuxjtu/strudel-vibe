import "./index.css";
import { Composition } from "remotion";
import { VibeDemo } from "./VibeDemo";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./scenes";
import { Viral } from "./viral/Viral";
import { FPS as VFPS, DURATION_FRAMES } from "./viral/config";
import { ViralCN } from "./viral/ViralCN";
import { FPS as CNFPS, DURATION_FRAMES as CN_FRAMES } from "./viral/config-cn";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VibeDemo"
        component={VibeDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {/* Viral cut — real captured Strudel audio + audio-reactive spectrum */}
      <Composition
        id="ViralVertical"
        component={Viral}
        durationInFrames={DURATION_FRAMES}
        fps={VFPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="ViralLandscape"
        component={Viral}
        durationInFrames={DURATION_FRAMES}
        fps={VFPS}
        width={1920}
        height={1080}
      />
      {/* RedNote (小红书) cut — calm Chinese user, Chinese captions */}
      <Composition
        id="ViralCNVertical"
        component={ViralCN}
        durationInFrames={CN_FRAMES}
        fps={CNFPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
