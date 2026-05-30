import React from 'react';
import { staticFile, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../constants';

interface ScreenshotPlaceholderProps {
  /** filename inside promo/public/assets/, e.g. "real-top6.png" */
  src: string;
  /** human label shown when image is missing */
  label: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

/**
 * Renders an asset from /assets/. If the image is missing, falls back
 * to a clearly labeled sage placeholder so the timeline is still legible.
 *
 * TODO for the user: drop the real screenshot at promo/public/assets/{src}.
 */
export const ScreenshotPlaceholder: React.FC<ScreenshotPlaceholderProps> = ({
  src,
  label,
  width = 640,
  height = 1240,
  style,
}) => {
  const frame = useCurrentFrame();
  const shimmer = interpolate(frame % 60, [0, 30, 60], [0.6, 1, 0.6]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(160deg, ${COLORS.sage100}, ${COLORS.sage200})`,
        border: `2px dashed ${COLORS.sage400}`,
        ...style,
      }}
    >
      <img
        src={staticFile(`assets/${src}`)}
        onError={(e) => {
          // hide broken-image icon when the file is missing
          (e.currentTarget as HTMLImageElement).style.opacity = '0';
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          inset: 0,
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.sage700,
          fontWeight: 700,
          textAlign: 'center',
          padding: 24,
          gap: 10,
          mixBlendMode: 'multiply',
          opacity: shimmer * 0.85,
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>截图占位</div>
        <div style={{ fontSize: 36 }}>{label}</div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>{src}</div>
      </div>
    </div>
  );
};
