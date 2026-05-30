import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import { COLORS } from '../constants';
import { MJTile } from '../components/MJTile';
import { BigCaption } from '../components/BigCaption';

/**
 * 56-60s — brand outro
 * Tiles fly back and form "川麻小助手" composition; tagline + project URL.
 */
const TILES = ['1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','5p','9p','1s','5s','9s'];

export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // a soft branded gradient + data flow
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${COLORS.sage100} 0%, ${COLORS.sage300} 60%, ${COLORS.sage600} 100%)`,
        }}
      />
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: 'absolute', inset: 0, opacity: 0.18 }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={i * 110}
            x2={1080}
            y2={i * 110 + 30}
            stroke={COLORS.sage700}
            strokeWidth={2}
            strokeDasharray="6 12"
            strokeDashoffset={-(frame * 3) % 40}
          />
        ))}
      </svg>

      {/* tile cluster -> converges into title bar */}
      {TILES.map((c, i) => {
        const r = spring({
          frame: frame - i,
          fps,
          config: { damping: 16, stiffness: 110 },
        });
        const angle = (i / TILES.length) * Math.PI * 2;
        const startX = 540 + Math.cos(angle) * 900;
        const startY = 960 + Math.sin(angle) * 1200;
        const x = interpolate(r, [0, 1], [startX, 540 + (i - TILES.length / 2) * 60]);
        const y = interpolate(r, [0, 1], [startY, 760]);
        const sc = interpolate(r, [0, 1], [0.4, 0.8]);
        const op = interpolate(r, [0, 0.3, 1], [0, 1, 0.7]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${sc})`,
              opacity: op,
            }}
          >
            <MJTile code={c} size={86} />
          </div>
        );
      })}

      {/* title */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 980,
          textAlign: 'center',
          padding: '0 40px',
        }}
      >
        <BigTitle frame={frame} />
        <div
          style={{
            marginTop: 24,
            fontSize: 44,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 4px 18px rgba(0,0,0,0.2)',
            opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          让每一次选择，都有参考答案
        </div>
        <div
          style={{
            marginTop: 32,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            background: 'rgba(255,255,255,0.95)',
            padding: '14px 30px',
            borderRadius: 999,
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.sage800,
            boxShadow: `0 10px 30px ${COLORS.shadow}`,
            opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          🌐 mjcrqs.top
          <span style={{ color: COLORS.sage600, fontWeight: 700, fontSize: 22 }}>
            · mahjongCRQS
          </span>
        </div>
      </div>

      {/* footer disclaimer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 80,
          textAlign: 'center',
          fontSize: 22,
          color: '#1c2a20cc',
          padding: '0 60px',
          opacity: interpolate(frame, [70, 100], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        仅供学习和娱乐参考，且该助手不考虑防守
      </div>
    </AbsoluteFill>
  );
};

const BigTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const text = '川麻小助手';
  return (
    <div
      style={{
        fontSize: 130,
        fontWeight: 900,
        color: '#fff',
        letterSpacing: 12,
        textShadow: `0 6px 24px ${COLORS.sage700}`,
        display: 'flex',
        gap: 6,
        justifyContent: 'center',
      }}
    >
      {text.split('').map((ch, i) => {
        const t = interpolate(frame - 30 - i * 6, [0, 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const ty = interpolate(t, [0, 1], [40, 0]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${ty}px)`,
              opacity: t,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};
