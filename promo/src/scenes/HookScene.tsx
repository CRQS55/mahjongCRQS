import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { COLORS } from '../constants';
import { MJTile } from '../components/MJTile';
import { BigCaption } from '../components/BigCaption';

/**
 * 0-3s — pain hook
 * Dark mahjong table fades up, 14 tiles tremble, "滴 滴 滴" timer ring pulses.
 * TODO: replace background with promo/public/assets/gpt-mahjong-table.png
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const bgFade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const handsFade = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const ringPulse = 1 + Math.sin(frame * 0.4) * 0.08;
  const tickAlpha = 0.4 + 0.6 * (Math.sin(frame * 0.6) ** 2);

  // 14 tiles, with one shaking more than the others (the "纠结" one)
  const handCodes = ['1m','2m','3m','4m','5m','6m','7m','3p','4p','5p','7s','7s','8s','9s'];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: bgFade,
          background: `
            radial-gradient(ellipse at 50% 70%, #1d3a25 0%, #0a140d 70%),
            url(${staticFile('assets/gpt-hook-cinematic.png')}) center/cover
          `,
          backgroundBlendMode: 'multiply',
        }}
      />

      {/* spotlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 75%, rgba(255,255,255,0.18) 0%, transparent 55%)',
          opacity: bgFade,
        }}
      />

      {/* timer ring with ticking dot */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 360,
          transform: `translateX(-50%) scale(${ringPulse})`,
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: `6px solid ${COLORS.gold}`,
          boxShadow: `0 0 60px ${COLORS.gold}88`,
          opacity: bgFade,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.gold,
            fontSize: 90,
            fontWeight: 900,
            opacity: tickAlpha,
            textShadow: '0 0 22px rgba(245,196,81,0.7)',
          }}
        >
          ?
        </div>
      </div>

      <BigCaption text="这手川麻，到底打哪张？" />

      {/* 14 tiles row */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 220,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          flexWrap: 'wrap',
          padding: '0 30px',
          opacity: handsFade,
        }}
      >
        {handCodes.map((c, i) => {
          const wobble = Math.sin(frame * 0.5 + i) * (i === 7 ? 5 : 1.5);
          const lift = i === 7 ? Math.sin(frame * 0.45) * 14 : 0;
          return (
            <div key={i} style={{ transform: `translateY(${lift}px) rotate(${wobble}deg)` }}>
              <MJTile code={c} size={92} highlight={i === 7 && Math.sin(frame * 0.45) > 0.3} />
            </div>
          );
        })}
      </div>

      {/* hovering hand silhouette hint */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: 540,
          fontSize: 70,
          opacity: handsFade * (0.6 + 0.4 * Math.sin(frame * 0.3)),
          filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.4))',
        }}
      >
        🫳
      </div>

      {/* tick marks */}
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          opacity: bgFade,
        }}
      >
        {[0, 1, 2].map((i) => {
          const on = (Math.floor(frame / 12) % 3) >= i;
          return (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: on ? COLORS.gold : '#ffffff20',
                boxShadow: on ? `0 0 18px ${COLORS.gold}` : 'none',
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
