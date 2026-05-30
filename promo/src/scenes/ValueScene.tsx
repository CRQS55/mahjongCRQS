import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import { COLORS } from '../constants';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 26-32s — value reasoning
 * Tags fly in like data streams and converge into a "综合推荐" panel.
 * Pure animation, no real screenshot needed.
 */
const TAGS = [
  { text: '进张',     color: '#52a062' },
  { text: '胡牌概率', color: '#3f854c' },
  { text: '番数潜力', color: '#d99a2b' },
  { text: '保留根',   color: '#75b783' },
  { text: '清一色可能', color: '#487a32' },
  { text: '七对',     color: '#5f9942' },
  { text: '碰碰胡',   color: '#3f854c' },
];

export const ValueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BigCaption text="速度 + 牌型价值，综合推荐" />

      {/* center target panel */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 1000,
          transform: `translate(-50%, -50%) scale(${0.85 + enter * 0.15})`,
          width: 760,
          padding: 36,
          borderRadius: 32,
          background: 'rgba(255,255,255,0.92)',
          border: `2px solid ${COLORS.sage300}`,
          boxShadow: `0 24px 60px ${COLORS.shadow}, inset 0 0 0 4px ${COLORS.sage100}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.sage700,
            letterSpacing: 4,
          }}
        >
          综合推荐
        </div>
        <div
          style={{
            fontSize: 130,
            fontWeight: 900,
            color: COLORS.sage600,
            margin: '14px 0',
            textShadow: `0 4px 18px ${COLORS.shadow}`,
          }}
        >
          5s
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 6,
          }}
        >
          {[
            { k: '速度', v: '92' },
            { k: '价值', v: '88' },
            { k: 'EV',  v: '+1.3' },
          ].map((m) => (
            <div
              key={m.k}
              style={{
                background: COLORS.sage100,
                color: COLORS.sage800,
                padding: '10px 22px',
                borderRadius: 14,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.7 }}>{m.k}</div>
              <div>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* flying tags converging into the panel */}
      {TAGS.map((tag, i) => {
        const start = 6 + i * 5;
        const t = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 120 } });
        const angle = (i / TAGS.length) * Math.PI * 2;
        const startX = 540 + Math.cos(angle) * 700;
        const startY = 1000 + Math.sin(angle) * 700;
        const x = interpolate(t, [0, 1], [startX, 540]);
        const y = interpolate(t, [0, 1], [startY, 1000]);
        const op = interpolate(t, [0, 0.2, 0.85, 1], [0, 1, 1, 0]);
        const sc = interpolate(t, [0, 0.5, 1], [0.6, 1.05, 0.4]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${sc})`,
              padding: '12px 24px',
              borderRadius: 14,
              background: '#fff',
              border: `2px solid ${tag.color}`,
              color: tag.color,
              fontSize: 28,
              fontWeight: 800,
              opacity: op,
              boxShadow: `0 6px 20px ${tag.color}33`,
              whiteSpace: 'nowrap',
            }}
          >
            {tag.text}
          </div>
        );
      })}

      {/* data stream lines */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x2 = 540 + Math.cos(angle) * 800;
          const y2 = 1000 + Math.sin(angle) * 800;
          const dash = (frame * 4) % 60;
          return (
            <line
              key={i}
              x1={540}
              y1={1000}
              x2={x2}
              y2={y2}
              stroke={COLORS.sage400}
              strokeWidth={2}
              strokeDasharray="6 14"
              strokeDashoffset={-dash}
              opacity={0.18}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
