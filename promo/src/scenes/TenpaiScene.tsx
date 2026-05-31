import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';
import { MJTile } from '../components/MJTile';
import { PhoneFrame } from '../components/PhoneFrame';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 12-18s — 13-tile tenpai analysis
 * Phone shows hand of 13 tiles, "已下叫" badge appears, waiting tiles flip
 * up one by one with remaining-count and probability.
 * TODO: replace background screenshot with promo/public/assets/real-tenpai.png
 */
const HAND = ['1m','2m','3m','4m','5m','6m','7m','8m','9m','3p','4p','5p','5s'];
const WAITS: Array<{ code: string; remain: number; pct: number }> = [
  { code: '5s', remain: 3, pct: 28 },
  { code: '8s', remain: 2, pct: 18 },
  { code: '5p', remain: 1, pct: 12 },
];

export const TenpaiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const badgePop = spring({ frame: frame - 30, fps, config: { damping: 12, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `center / cover no-repeat url(${staticFile('assets/gpt-tenpai-spotlight.png')})`,
          opacity: 0.35,
          mixBlendMode: 'multiply',
        }}
      />
      <BigCaption text="胡哪几张，一眼看清" />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 380,
          transform: `translateX(-50%) scale(${0.94 + phoneIn * 0.06})`,
        }}
      >
        <PhoneFrame width={760} height={1380}>
          <div
            style={{
              padding: 50,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              background: COLORS.bgCream,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 28, color: COLORS.sage700, fontWeight: 700 }}>
                听牌分析
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: '#fff',
                  background: `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage700})`,
                  padding: '10px 22px',
                  borderRadius: 999,
                  transform: `scale(${badgePop})`,
                  boxShadow: `0 6px 18px ${COLORS.shadow}`,
                }}
              >
                ✓ 已下叫
              </div>
            </div>

            {/* hand row */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: COLORS.sage50,
                padding: 14,
                borderRadius: 18,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {HAND.map((c, i) => (
                <MJTile key={i} code={c} size={56} />
              ))}
            </div>

            {/* waits flipping in one by one */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginTop: 10,
              }}
            >
              <div style={{ fontSize: 26, color: COLORS.sage700, fontWeight: 700 }}>
                可胡牌
              </div>
              {WAITS.map((w, i) => {
                const start = 50 + i * 28;
                const t = spring({
                  frame: frame - start,
                  fps,
                  config: { damping: 16, stiffness: 130 },
                });
                const flip = interpolate(t, [0, 1], [90, 0]);
                const op = interpolate(t, [0, 0.4], [0, 1]);

                const pctNow =
                  interpolate(frame - start - 6, [0, 30], [0, w.pct], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 22,
                      padding: 18,
                      borderRadius: 18,
                      background: '#fff',
                      border: `1px solid ${COLORS.sage200}`,
                      opacity: op,
                      transform: `perspective(800px) rotateX(${flip}deg)`,
                      boxShadow: `0 6px 18px ${COLORS.shadow}`,
                    }}
                  >
                    <MJTile code={w.code} size={86} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: COLORS.sage800,
                        }}
                      >
                        剩 {w.remain} 张
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 12,
                          background: COLORS.sage100,
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(pctNow / 30) * 100}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${COLORS.sage400}, ${COLORS.sage600})`,
                            transition: 'width .2s',
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 38,
                        fontWeight: 900,
                        color: COLORS.sage600,
                        minWidth: 110,
                        textAlign: 'right',
                      }}
                    >
                      {pctNow.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
