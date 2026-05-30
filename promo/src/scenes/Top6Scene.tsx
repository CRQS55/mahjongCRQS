import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';
import { MJTile } from '../components/MJTile';
import { PhoneFrame } from '../components/PhoneFrame';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 18-26s — 14-tile discard suggestion (Top 6)
 * Phone shows top-6 list. #1 row glows gold, evaluation bar fills.
 * TODO: replace mock with promo/public/assets/real-top6.png if cleaner.
 */
const TOP6: Array<{ code: string; score: number; effective: number }> = [
  { code: '5s', score: 92, effective: 18 },
  { code: '8s', score: 84, effective: 14 },
  { code: '1m', score: 71, effective: 11 },
  { code: '9m', score: 65, effective: 9 },
  { code: '3p', score: 52, effective: 8 },
  { code: '7p', score: 41, effective: 6 },
];

export const Top6Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BigCaption text="直接告诉你：先打哪张" />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 380,
          transform: `translateX(-50%) scale(${0.9 + enter * 0.1})`,
        }}
      >
        <PhoneFrame width={780} height={1400}>
          <div
            style={{
              padding: 46,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
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
              <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.sage800 }}>
                出牌建议 Top 6
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: COLORS.sage700,
                  background: COLORS.sage100,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: `1px solid ${COLORS.sage200}`,
                }}
              >
                综合评分
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP6.map((t, i) => {
                const start = 30 + i * 18;
                const r = spring({
                  frame: frame - start,
                  fps,
                  config: { damping: 16, stiffness: 130 },
                });
                const op = interpolate(r, [0, 1], [0, 1]);
                const tx = interpolate(r, [0, 1], [80, 0]);
                const fill = interpolate(frame - start - 8, [0, 24], [0, t.score], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const isTop = i === 0;
                const goldRing = isTop && Math.sin(frame * 0.18) > 0;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      padding: 16,
                      background: '#fff',
                      borderRadius: 18,
                      opacity: op,
                      transform: `translateX(${tx}px)`,
                      border: isTop
                        ? `3px solid ${COLORS.gold}`
                        : `1px solid ${COLORS.sage200}`,
                      boxShadow: isTop
                        ? `0 0 ${goldRing ? 30 : 18}px ${COLORS.gold}88`
                        : `0 4px 12px ${COLORS.shadow}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: isTop ? COLORS.goldDeep : COLORS.sage600,
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      #{i + 1}
                    </div>
                    <MJTile code={t.code} size={isTop ? 88 : 70} highlight={isTop} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 22,
                          color: COLORS.sage700,
                          fontWeight: 600,
                        }}
                      >
                        进张 {t.effective} 种
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 14,
                          background: COLORS.sage100,
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${fill}%`,
                            height: '100%',
                            background: isTop
                              ? `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldDeep})`
                              : `linear-gradient(90deg, ${COLORS.sage400}, ${COLORS.sage600})`,
                            transition: 'width .2s',
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: isTop ? 40 : 30,
                        fontWeight: 900,
                        color: isTop ? COLORS.goldDeep : COLORS.sage700,
                        minWidth: 90,
                        textAlign: 'right',
                      }}
                    >
                      {fill.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 'auto',
                fontSize: 18,
                color: COLORS.sage600,
                textAlign: 'center',
                opacity: 0.7,
              }}
            >
              基于剩余牌山 · 进张 / 速度 / 牌型价值 综合
            </div>
          </div>
        </PhoneFrame>
      </div>

      {/* a "推荐" gold ribbon */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 540,
          transform: 'translateX(-50%) rotate(-8deg)',
          padding: '10px 30px',
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDeep})`,
          color: '#fff',
          fontSize: 28,
          fontWeight: 900,
          borderRadius: 12,
          boxShadow: `0 8px 22px ${COLORS.goldDeep}55`,
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        ★ 推荐打 5s
      </div>
    </AbsoluteFill>
  );
};
