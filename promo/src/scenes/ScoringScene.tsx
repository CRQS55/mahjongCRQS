import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';
import { COLORS } from '../constants';
import { PhoneFrame } from '../components/PhoneFrame';
import { BigCaption } from '../components/BigCaption';
import { SceneBackground } from '../components/SceneBackground';

/**
 * 45-51s — score settlement
 * Toggle rows light up (海底捞月 / 杠上花 / 抢杠胡), base score & fan cap chips
 * pulse, 每家应付 number rolls up.
 * TODO: real settlement screenshot at promo/public/assets/real-scoring.png
 */
const TOGGLES = [
  { label: '海底捞月', start: 18 },
  { label: '杠上花',   start: 32 },
  { label: '抢杠胡',   start: 46 },
];

export const ScoringScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });

  const finalAmount = 96;
  const amount = interpolate(frame - 80, [0, 36], [0, finalAmount], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `center / cover no-repeat url(${staticFile('assets/gpt-scoring-coin.png')})`,
          opacity: 0.32,
          mixBlendMode: 'multiply',
        }}
      />
      <BigCaption text="番数结算，也能一键搞定" />

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
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.sage700 }}>
              结算设置
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Chip label="底分 1" delay={6} frame={frame} fps={fps} />
              <Chip label="封顶 4 番" delay={12} frame={frame} fps={fps} />
              <Chip label="带根加番" delay={18} frame={frame} fps={fps} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOGGLES.map((t, i) => {
                const on = frame >= t.start;
                const pop = spring({
                  frame: frame - t.start,
                  fps,
                  config: { damping: 12, stiffness: 220 },
                });
                return (
                  <div
                    key={t.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 22px',
                      borderRadius: 16,
                      background: on ? COLORS.sage50 : '#fff',
                      border: `2px solid ${on ? COLORS.sage400 : COLORS.sage200}`,
                      transition: 'all .25s',
                      transform: on ? `scale(${0.97 + pop * 0.03})` : 'scale(1)',
                    }}
                  >
                    <div style={{ fontSize: 26, color: COLORS.sage800, fontWeight: 700 }}>
                      {t.label}
                    </div>
                    <div
                      style={{
                        width: 64,
                        height: 36,
                        borderRadius: 999,
                        background: on ? COLORS.sage500 : '#ddd',
                        position: 'relative',
                        transition: 'all .25s',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: 4,
                          left: on ? 32 : 4,
                          transition: 'left .25s',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* result block */}
            <div
              style={{
                marginTop: 'auto',
                background: `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage700})`,
                borderRadius: 22,
                padding: 26,
                color: '#fff',
                textAlign: 'center',
                boxShadow: `0 14px 40px ${COLORS.shadow}`,
              }}
            >
              <div style={{ fontSize: 22, opacity: 0.85 }}>每家应付</div>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  letterSpacing: 4,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 4px 18px rgba(0,0,0,0.25)',
                }}
              >
                {amount.toFixed(0)}
              </div>
              <div style={{ fontSize: 20, opacity: 0.85 }}>底分 × 番数 × 加成 自动计算</div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string; delay: number; frame: number; fps: number }> = ({
  label,
  delay,
  frame,
  fps,
}) => {
  const t = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 200 } });
  const sc = interpolate(t, [0, 1], [0.6, 1]);
  const op = interpolate(t, [0, 0.3], [0, 1]);
  return (
    <div
      style={{
        background: COLORS.sage100,
        border: `1px solid ${COLORS.sage300}`,
        color: COLORS.sage700,
        fontSize: 22,
        fontWeight: 700,
        padding: '10px 18px',
        borderRadius: 999,
        transform: `scale(${sc})`,
        opacity: op,
      }}
    >
      {label}
    </div>
  );
};
