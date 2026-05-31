import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';
import { SceneBackground } from '../components/SceneBackground';
import { PhoneFrame } from '../components/PhoneFrame';
import { BigCaption } from '../components/BigCaption';

/**
 * 3-6s — product intro (v2: 3s, URL-forward)
 * Phone slides up from bottom; the dominant element on screen is the
 * URL pill `mjcrqs.top` so viewers know exactly where to go.
 * Searching "川麻小助手" doesn't surface our site, so the URL has to do
 * the heavy lifting.
 *
 * TODO: replace homepage screenshot with promo/public/assets/real-homepage.png
 */
export const ProductIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slide = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110, mass: 0.9 },
  });
  const translateY = interpolate(slide, [0, 1], [1700, 280]);
  const buttonPulse = 1 + 0.06 * Math.sin(frame * 0.35);

  // Big URL pill near the bottom — pops in after phone settles
  const urlIn = spring({
    frame: frame - 22,
    fps,
    config: { damping: 14, stiffness: 130 },
  });
  const urlScale = interpolate(urlIn, [0, 1], [0.6, 1]);
  const urlGlow = 1 + 0.08 * Math.sin(frame * 0.32);

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BigCaption text="川麻小助手" subText="访问 mjcrqs.top 立即体验" />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: `translateX(-50%) translateY(${translateY}px) scale(0.78)`,
          transformOrigin: 'top center',
        }}
      >
        <PhoneFrame width={680} height={1380}>
          <FauxHomepage frame={frame} buttonPulse={buttonPulse} />
        </PhoneFrame>
      </div>

      {/* Dominant URL banner — anchored to lower 1/3 of the canvas */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: interpolate(urlIn, [0, 0.4], [0, 1]),
          transform: `scale(${urlScale * urlGlow})`,
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.sage700,
            letterSpacing: 4,
            opacity: 0.85,
          }}
        >
          打开浏览器，输入网址
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '28px 64px',
            borderRadius: 999,
            background: `linear-gradient(135deg, ${COLORS.sage600}, ${COLORS.sage800})`,
            color: '#fff',
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 4,
            boxShadow: `0 24px 60px ${COLORS.sage700}aa, 0 0 ${
              60 * urlGlow
            }px ${COLORS.gold}66`,
            border: `4px solid ${COLORS.gold}`,
          }}
        >
          <span style={{ fontSize: 60 }}>🌐</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>
            mjcrqs.top
          </span>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.sage600,
            background: 'rgba(255,255,255,0.85)',
            padding: '8px 22px',
            borderRadius: 999,
            border: `1px solid ${COLORS.sage300}`,
          }}
        >
          直接访问，无需下载
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FauxHomepage: React.FC<{ frame: number; buttonPulse: number }> = ({
  frame,
  buttonPulse,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(180deg, ${COLORS.sage50} 0%, ${COLORS.bgCream} 60%)`,
        padding: '70px 30px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage700})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 900,
            fontSize: 28,
          }}
        >
          川
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: COLORS.sage800 }}>
          川麻小助手
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 18,
            color: COLORS.sage600,
            background: COLORS.sage100,
            padding: '4px 14px',
            borderRadius: 999,
          }}
        >
          mjcrqs.top
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: 22,
          border: `1px solid ${COLORS.sage200}`,
          boxShadow: `0 6px 24px ${COLORS.shadow}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 22, color: COLORS.sage700, fontWeight: 600 }}>
          手牌输入
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            background: COLORS.sage50,
            padding: 14,
            borderRadius: 14,
            minHeight: 110,
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 36,
                height: 52,
                borderRadius: 6,
                background: '#fff',
                border: `1px dashed ${COLORS.sage300}`,
              }}
            />
          ))}
        </div>

        {/* the highlighted button */}
        <button
          style={{
            border: 'none',
            padding: '20px 28px',
            borderRadius: 18,
            background: `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage600})`,
            color: '#fff',
            fontSize: 30,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            transform: `scale(${buttonPulse})`,
            boxShadow: `0 0 ${30 * buttonPulse}px ${COLORS.sage400}`,
          }}
        >
          📸 拍照识牌
        </button>
        <button
          style={{
            border: `1px solid ${COLORS.sage300}`,
            padding: '14px 22px',
            borderRadius: 16,
            background: '#fff',
            color: COLORS.sage700,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          手动选牌
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {['听牌分析', '出牌建议', '番数结算'].map((t, i) => {
          const on = Math.floor(frame / 18) % 3 === i;
          return (
            <div
              key={t}
              style={{
                flex: 1,
                background: on ? COLORS.sage500 : '#fff',
                color: on ? '#fff' : COLORS.sage700,
                border: `1px solid ${COLORS.sage200}`,
                borderRadius: 16,
                padding: '14px 0',
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                transition: 'all .3s',
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
};
