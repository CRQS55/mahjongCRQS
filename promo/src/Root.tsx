import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { PromoVideo } from './PromoVideo';
import { FPS, TOTAL_FRAMES, WIDTH, HEIGHT } from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

registerRoot(RemotionRoot);
