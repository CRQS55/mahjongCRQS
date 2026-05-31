import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  staticFile,
} from 'remotion';
import { COLORS } from '../constants';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 38–45s · opening / mid-game helper
 *
 * Three real product screenshots displayed full-bleed inside a big rounded
 * preview card so the UI is readable. Phone bezel intentionally dropped —
 * 1080×1920 canvas + a phone bezel = tiny screen that can't be read.
 *
 *   real-strategy-dingque.png   — 定缺建议
 *   real-strategy-huansan.png   — 换三张策略
 *   real-strategy-peng.png      — 是否碰
 *
 * Layout:
 *   - BigCaption: top
 *   - Tab strip:  3 tabs lit one at a time
 *   - Big card:   ~880×1080, objectFit: contain so nothing gets cropped
 *   - Pill:       gold "★ 推荐" pill at the bottom
 */

interface Card {
  tab: string;
  asset: string;
  recommend: string;
  icon: string;
}

const CARDS: Card[] = [
  { tab: '定缺',   asset: 'real-strategy-dingque.png', recommend: '建议缺筒',    icon: '🌀' },
  { tab: '换三张', asset: 'real-strategy-huansan.png', recommend: '优先换边张',  icon: '🔁' },
  { tab: '是否碰', asset: 'real-strategy-peng.png',    recommend: '建议不碰',    icon: '🤚' },
];

const ENTER = 12;
const PER_CARD = 66; // 12 + 3*66 = 210 frames

export const StrategyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - ENTER);
  const activeIndex = Math.min(CARDS.length - 1, Math.floor(localFrame / PER_CARD));
  const within = localFrame - activeIndex * PER_CARD;

  return (
    <AbsoluteFill>
      <SceneBackground />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `center / cover no-repeat url(${staticFile('assets/gpt-strategy-board.png')})`,
          opacity: 0.32,
          mixBlendMode: 'multiply',
        }}
      />
      <BigCaption text="开局、中盘，都能帮你想一步" />

      {/* tab strip */}
      <div
        style={{
          position: 'absolute',
          left: 50,
          right: 50,
          top: 410,
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        {CARDS.map((c, i) => {
          const isActive = i === activeIndex;
          const enter = spring({
            frame: frame - i * 4,
            fps,
            config: { damping: 16, stiffness: 140 },
          });
          const sc = interpolate(enter, [0, 1], [0.6, 1]);
          return (
            <div
              key={c.tab}
              style={{
                flex: 1,
                background: isActive
                  ? `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage700})`
                  : '#fff',
                color: isActive ? '#fff' : COLORS.sage700,
                border: `2px solid ${isActive ? COLORS.sage700 : COLORS.sage200}`,
                borderRadius: 20,
                padding: '14px 0',
                textAlign: 'center',
                fontWeight: 800,
                letterSpacing: 2,
                transform: `scale(${sc}) ${isActive ? 'translateY(-6px)' : ''}`,
                boxShadow: isActive
                  ? `0 14px 30px ${COLORS.shadow}`
                  : `0 4px 12px ${COLORS.shadow}`,
                opacity: enter,
                transition: 'all .25s',
              }}
            >
              <div style={{ fontSize: 36 }}>{c.icon}</div>
              <div style={{ fontSize: 30 }}>{c.tab}</div>
            </div>
          );
        })}
      </div>

      {/* big preview card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 600,
          transform: 'translateX(-50%)',
          width: 920,
          height: 1080,
          borderRadius: 36,
          padding: 18,
          background: '#fff',
          border: `2px solid ${COLORS.sage300}`,
          boxShadow: `0 30px 80px ${COLORS.shadow}`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 22,
            overflow: 'hidden',
            background: COLORS.sage50,
          }}
        >
          {CARDS.map((c, i) => {
            const center = ENTER + i * PER_CARD + PER_CARD / 2;
            const half = PER_CARD / 2;
            const op = interpolate(
              frame,
              [center - half - 6, center - half + 8, center + half - 8, center + half + 6],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            // gentle parallax: slight scale-in while active
            const sc = interpolate(
              frame,
              [center - half, center, center + half],
              [1.02, 1.0, 0.98]
            );
            return (
              <img
                key={c.asset}
                src={staticFile(`assets/${c.asset}`)}
                alt={c.tab}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center top',
                  background: COLORS.sage50,
                  opacity: op,
                  transform: `scale(${sc})`,
                  transformOrigin: 'center top',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0';
                }}
              />
            );
          })}

          {/* corner ribbon: which card you are looking at */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              border: `1px solid ${COLORS.sage200}`,
              color: COLORS.sage700,
              fontSize: 22,
              fontWeight: 700,
              boxShadow: `0 4px 12px ${COLORS.shadow}`,
            }}
          >
            {CARDS[activeIndex].tab}
          </div>
        </div>
      </div>

      {/* recommendation pill, re-pops on each card */}
      <RecommendPill
        key={`pill-${activeIndex}`}
        text={CARDS[activeIndex].recommend}
        within={within}
        fps={fps}
      />

      {/* timeline dots */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        {CARDS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: i === activeIndex ? COLORS.sage600 : COLORS.sage200,
              boxShadow: i === activeIndex ? `0 0 14px ${COLORS.sage400}` : 'none',
              transition: 'all .25s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const RecommendPill: React.FC<{ text: string; within: number; fps: number }> = ({
  text,
  within,
  fps,
}) => {
  const pop = spring({
    frame: within - 8,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const sc = interpolate(pop, [0, 1], [0.6, 1]);
  const op = interpolate(pop, [0, 0.3], [0, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 1760,
        transform: `translate(-50%, -50%) scale(${sc})`,
        background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDeep})`,
        color: '#fff',
        fontSize: 56,
        fontWeight: 900,
        letterSpacing: 4,
        padding: '20px 50px',
        borderRadius: 999,
        boxShadow: `0 16px 40px ${COLORS.goldDeep}55`,
        opacity: op,
        textShadow: '0 4px 12px rgba(0,0,0,0.25)',
        whiteSpace: 'nowrap',
      }}
    >
      ★ {text}
    </div>
  );
};
