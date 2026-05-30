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
import { PhoneFrame } from '../components/PhoneFrame';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 32-38s — visible tiles input changes the remaining-tile counts.
 *
 * Honest to the real product:
 *   - 没有进度条
 *   - "已知打出/可见的牌" 列表里每张牌带 "已见 N" 角标
 *   - 听牌区里每张胡牌带 "剩 N 张" 角标
 *   - 加入可见牌后，胡牌区的 "剩 N 张" 会减少
 *
 * Optionally swap the right-half phone screen with promo/public/assets/real-visible-tiles.png
 * via the PhoneFrame `bgImage` prop if you prefer the real screenshot.
 */

interface Wait { code: string; before: number; after: number }
const WAITS: Wait[] = [
  { code: '5s', before: 4, after: 2 },
  { code: '8s', before: 3, after: 1 },
  { code: '5p', before: 2, after: 2 }, // unaffected -> stays
];
const ADDED = [
  { code: '5s', seen: 2 },
  { code: '8s', seen: 2 },
  { code: '6m', seen: 1 },
];

export const VisibleTilesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });

  // tile drop-in frames into 已见 tray
  const dropFrames = [22, 40, 58];
  // visible recompute kicks in after the last drop
  const recomputeStart = 78;

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BigCaption text="场上打过的牌，也能算进去" />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 380,
          transform: `translateX(-50%) scale(${0.92 + phoneIn * 0.08})`,
        }}
      >
        <PhoneFrame width={760} height={1380}>
          <div
            style={{
              padding: 44,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              background: COLORS.bgCream,
            }}
          >
            {/* ② 已知打出/可见的牌 — section header matches real UI */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.sage800 }}>
                ② 已知打出 / 可见的牌
              </div>
              <button
                style={{
                  fontSize: 18,
                  color: COLORS.sage700,
                  background: '#fff',
                  border: `1px solid ${COLORS.sage300}`,
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                + 添加
              </button>
            </div>

            {/* tray with 已见N badges, faithful to MJTile.badge */}
            <div
              style={{
                background: COLORS.sage50,
                border: `2px dashed ${COLORS.sage300}`,
                borderRadius: 18,
                padding: '24px 18px 28px',
                display: 'flex',
                gap: 18,
                minHeight: 120,
                alignItems: 'center',
              }}
            >
              {ADDED.map((a, i) => {
                const t = spring({
                  frame: frame - dropFrames[i],
                  fps,
                  config: { damping: 12, stiffness: 200 },
                });
                const dy = interpolate(t, [0, 1], [-180, 0]);
                const op = interpolate(t, [0, 0.2], [0, 1]);
                const badgePop = spring({
                  frame: frame - dropFrames[i] - 8,
                  fps,
                  config: { damping: 10, stiffness: 240 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      transform: `translateY(${dy}px)`,
                      opacity: op,
                      position: 'relative',
                    }}
                  >
                    <MJTile code={a.code} size={70} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -8,
                        right: -10,
                        background: COLORS.sage500,
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transform: `scale(${badgePop})`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      已见 {a.seen}
                    </span>
                  </div>
                );
              })}
              <div
                style={{
                  marginLeft: 'auto',
                  fontSize: 16,
                  color: COLORS.sage600,
                  opacity: 0.75,
                }}
              >
                {Math.min(ADDED.length, Math.max(0, Math.floor((frame - 18) / 18)))} / 牌山 84
              </div>
            </div>

            {/* divider hint that recompute happened */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: interpolate(
                  frame - recomputeStart,
                  [0, 12],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: `linear-gradient(90deg, transparent, ${COLORS.sage300}, transparent)`,
                }}
              />
              <div
                style={{
                  fontSize: 18,
                  color: COLORS.sage600,
                  background: COLORS.sage100,
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontWeight: 700,
                  border: `1px solid ${COLORS.sage300}`,
                  whiteSpace: 'nowrap',
                }}
              >
                ↻ 已根据可见牌重新分析
              </div>
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: `linear-gradient(90deg, transparent, ${COLORS.sage300}, transparent)`,
                }}
              />
            </div>

            {/* 听牌结果区：剩 N 张数值会变 */}
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.sage700 }}>
              可胡牌 · 剩余张数实时更新
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {WAITS.map((w, i) => {
                const t = interpolate(
                  frame - recomputeStart,
                  [0, 22],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );
                const remaining = interpolate(t, [0, 1], [w.before, w.after]);
                const changed = w.before !== w.after && t > 0.05;
                const flashAlpha = changed
                  ? 0.5 + 0.5 * Math.sin((frame - recomputeStart) * 0.5)
                  : 1;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      background: '#fff',
                      borderRadius: 18,
                      padding: '18px 14px 26px',
                      border: `1px solid ${COLORS.sage200}`,
                      boxShadow: `0 4px 12px ${COLORS.shadow}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      minWidth: 180,
                    }}
                  >
                    <MJTile code={w.code} size={86} highlight={i === 0} />
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: changed ? COLORS.goldDeep : COLORS.sage800,
                        fontVariantNumeric: 'tabular-nums',
                        opacity: flashAlpha,
                      }}
                    >
                      剩 {remaining.toFixed(0)} 张
                    </div>
                    {changed && t > 0.4 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#c44',
                          background: '#ffe9e9',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        −{w.before - w.after}
                      </div>
                    )}
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
              已扣除手牌 + 副露 + 已见牌
            </div>
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
