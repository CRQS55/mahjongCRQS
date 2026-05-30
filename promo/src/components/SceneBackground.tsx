import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../constants';

/**
 * A subtle animated background: cream gradient with two slow-floating
 * sage radial blobs and a faint diagonal data-flow hatch.
 * Used to keep all scenes visually coherent.
 */
export const SceneBackground: React.FC<{ variant?: 'light' | 'dark' }> = ({
  variant = 'light',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  const blobX = interpolate(t, [0, 1], [-120, 80]);
  const blobY = interpolate(t, [0, 1], [80, -60]);

  if (variant === 'dark') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 30% 20%, ${COLORS.sage700} 0%, ${COLORS.sage900} 60%, #0e1a13 100%)`,
        }}
      />
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 0%, ${COLORS.sage100} 0%, transparent 55%),
            radial-gradient(ellipse at 80% 100%, ${COLORS.sage200} 0%, transparent 50%),
            ${COLORS.bgCream}
          `,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          left: blobX,
          top: 1100 + blobY,
          background: `radial-gradient(circle, ${COLORS.sage300}55 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.sage200}22 0 2px, transparent 2px 18px)`,
          opacity: 0.35,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
};
