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
 * 51–56s · quiz / rank progression
 *
 * Real /quiz screenshot fills a big preview card. Floating chips for the
 * three quiz types fly in over the top, and a tier progression bar lights
 * up at the bottom from 黑铁 → 钻石.
 *
 *   real-quiz.png — full /quiz page screenshot
 */

const TYPES = [
  { code: 'T1', name: '听几门' },
  { code: 'T2', name: '打哪张' },
  { code: 'T3', name: '看局打牌' },
];

interface Tier {
  name: string;
  badge?: string; // optional real badge image in /assets
}
const TIERS: Tier[] = [
  { name: '黑铁', badge: 'tier-heitie.png' },
  { name: '青铜' },
  { name: '白银', badge: 'tier-baiyin.png' },
  { name: '黄金' },
  { name: '铂金' },
  { name: '钻石', badge: 'tier-zuanshi.png' },
  { name: '超凡' },
  { name: '神话' },
  { name: '赋能', badge: 'tier-funeng.png' },
];

export const QuizScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BigCaption text="还能练牌感，冲段位" />

      {/* big real screenshot card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 420,
          transform: 'translateX(-50%)',
          width: 920,
          height: 980,
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
          <img
            src={staticFile('assets/real-quiz.png')}
            alt="测试水平"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center top',
              background: COLORS.sage50,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '0';
            }}
          />

          {/* T1 / T2 / T3 chips floating over the screenshot */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {TYPES.map((t, i) => {
              const start = 6 + i * 9;
              const r = spring({
                frame: frame - start,
                fps,
                config: { damping: 16, stiffness: 150 },
              });
              const tx = interpolate(r, [0, 1], [220, 0]);
              const op = interpolate(r, [0, 0.4], [0, 1]);
              return (
                <div
                  key={t.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'rgba(255,255,255,0.96)',
                    border: `2px solid ${COLORS.sage400}`,
                    borderRadius: 18,
                    padding: '12px 18px',
                    boxShadow: `0 10px 24px ${COLORS.shadow}`,
                    transform: `translateX(${tx}px)`,
                    opacity: op,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${COLORS.sage500}, ${COLORS.sage700})`,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                      fontWeight: 900,
                      letterSpacing: 1,
                    }}
                  >
                    {t.code}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: COLORS.sage800,
                    }}
                  >
                    {t.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* tier progression bar — sits below the preview card */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: 1450,
          padding: '24px 22px',
          borderRadius: 28,
          background: '#fff',
          border: `1px solid ${COLORS.sage200}`,
          boxShadow: `0 14px 40px ${COLORS.shadow}`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: COLORS.sage700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          段位进度
          <span
            style={{
              fontSize: 18,
              color: COLORS.sage600,
              background: COLORS.sage100,
              padding: '4px 12px',
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            练得越多，段位越高
          </span>
        </div>
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          {TIERS.map((tier, i) => {
            // 9 tiers in 150-frame scene: stagger from frame 30, every 8 frames
            const litStart = 30 + i * 8;
            const lit = frame >= litStart;
            const s = spring({
              frame: frame - litStart,
              fps,
              config: { damping: 12, stiffness: 220 },
            });
            const sc = lit ? interpolate(s, [0, 1], [0.6, 1]) : 0.6;
            const isFinal = i === TIERS.length - 1;
            const final = isFinal && lit;
            const size = 64;
            return (
              <React.Fragment key={tier.name}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transform: `scale(${sc})`,
                    minWidth: size,
                  }}
                >
                  <div
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: lit
                        ? final
                          ? `radial-gradient(circle, ${COLORS.gold}, ${COLORS.goldDeep})`
                          : tier.badge
                            ? '#fff'
                            : `radial-gradient(circle, ${COLORS.sage400}, ${COLORS.sage700})`
                        : '#eee',
                      color: lit ? '#fff' : '#aaa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 900,
                      boxShadow: lit
                        ? `0 0 ${final ? 32 : 18}px ${final ? COLORS.gold : COLORS.sage400}`
                        : 'none',
                      filter: lit ? 'none' : 'grayscale(0.85)',
                      transition: 'all .25s',
                    }}
                  >
                    {tier.badge ? (
                      <img
                        src={staticFile(`assets/${tier.badge}`)}
                        alt={tier.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          opacity: lit ? 1 : 0.45,
                        }}
                        onError={(e) => {
                          // hide broken-image icon if file is missing
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      final ? '★' : i + 1
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: lit ? COLORS.sage800 : '#aaa',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tier.name}
                  </div>
                </div>
                {i < TIERS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      minWidth: 12,
                      background:
                        frame >= 30 + i * 8 + 4
                          ? `linear-gradient(90deg, ${COLORS.sage400}, ${COLORS.sage600})`
                          : '#eee',
                      borderRadius: 3,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
