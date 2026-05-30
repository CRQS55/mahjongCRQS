import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';

interface BigCaptionProps {
  text: string;
  subText?: string;
  fadeOutAt?: number; // frame within scene to start fading caption out
}

/**
 * Large punchy caption used for every scene.
 * - Spring scale-in
 * - Subtle bottom→up motion
 * - Optional fade-out window
 */
export const BigCaption: React.FC<BigCaptionProps> = ({ text, subText, fadeOutAt }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.6 },
  });

  const fadeStart = fadeOutAt ?? Math.max(durationInFrames - 12, 0);
  const fade = interpolate(
    frame,
    [fadeStart, fadeStart + 12],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(enter, [0, 1], [40, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: '0 60px',
        opacity: enter * fade,
        transform: `translateY(${translateY}px) scale(${0.92 + enter * 0.08})`,
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: 2,
          color: COLORS.sage900,
          textAlign: 'center',
          lineHeight: 1.15,
          textShadow: '0 4px 18px rgba(82,160,98,0.18)',
          maxWidth: 960,
        }}
      >
        {text}
      </div>
      {subText && (
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: COLORS.sage600,
            background: 'rgba(255,255,255,0.85)',
            padding: '10px 28px',
            borderRadius: 999,
            border: `2px solid ${COLORS.sage200}`,
          }}
        >
          {subText}
        </div>
      )}
    </div>
  );
};
