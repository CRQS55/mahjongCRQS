import React from 'react';
import { staticFile } from 'remotion';
import { COLORS } from '../constants';

interface MJTileProps {
  code: string;            // e.g. "5m" / "9p" / "1s"
  size?: number;           // width in px; height auto
  highlight?: boolean;
  dim?: boolean;
  rotate?: number;
  style?: React.CSSProperties;
}

const RATIO = 96 / 66; // h/w from MJTile.lg

/**
 * Mirrors the project's MJTile look: rounded white tile, sage glow.
 * Uses /tiles/{code}.png copied from the main project via `npm run setup`.
 */
export const MJTile: React.FC<MJTileProps> = ({
  code,
  size = 110,
  highlight,
  dim,
  rotate = 0,
  style,
}) => {
  const w = size;
  const h = Math.round(size * RATIO);
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: highlight
          ? `0 0 0 5px ${COLORS.gold}, 0 12px 30px rgba(245,196,81,0.55)`
          : `0 6px 14px ${COLORS.shadow}`,
        opacity: dim ? 0.4 : 1,
        filter: dim ? 'grayscale(0.8)' : 'none',
        transform: `rotate(${rotate}deg)`,
        transition: 'all 0.2s ease',
        display: 'inline-block',
        ...style,
      }}
    >
      <img
        src={staticFile(`tiles/${code}.png`)}
        alt={code}
        width={w}
        height={h}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};
