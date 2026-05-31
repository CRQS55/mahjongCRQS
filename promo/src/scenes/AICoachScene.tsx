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
import { BigCaption } from '../components/BigCaption';

/**
 * 21–30s · AI Coach · "为什么是这一张"
 *
 * Storyboard:
 *  0.0–0.6s  inherit Top1 phone shrunk to left third; "AI 解释" gold pill on right
 *  0.6–1.2s  pill is "tapped" (ring + gold pulse), chat panel slides in from right
 *  1.2–1.5s  Claude avatar pops bottom-left of the panel
 *  1.5–6.5s  three reasons typewriter in sequence; key tokens flash gold
 *            ① 速度：进 22 张
 *            ② 番数：保留 9条 暗刻 (1 根) + 七对潜力
 *            ③ 第二名 8万 多 1 张但要拆暗刻
 *  6.5–7.5s  small "由 Claude 实时生成" badge fades in
 *  7.5–9.0s  caption "为什么是这一张" punches in big
 *
 * Optional bg: gpt-ai-coach-portrait.png (left), gpt-thought-bubble-bg.png (panel)
 *              gpt-claude-avatar.png (1:1 transparent) — bottom-left of panel
 */

const PANEL_IN_FRAME = 18; // 0.6s
const AVATAR_IN_FRAME = 36; // 1.2s
const TYPE_START = 45; // 1.5s
const TYPE_BLOCK_DUR = 50; // 1.67s per reason
const BADGE_FRAME = 195; // 6.5s
const BIG_CAPTION_FRAME = 225; // 7.5s

const REASONS: Array<{
  label: string;
  body: string;
  highlight: string;
  icon: string;
  color: string;
}> = [
  {
    label: '速度',
    body: '打 5万 后能进 22 张牌，是 Top6 里最多的。',
    highlight: '22 张',
    icon: '⚡',
    color: COLORS.sage600,
  },
  {
    label: '番数',
    body: '保留 9条 暗刻当作 1 根，还留着七对潜力。',
    highlight: '1 根',
    icon: '⭐',
    color: COLORS.goldDeep,
  },
  {
    label: '与第二名',
    body: '第二名 8万 多 1 张进张，但要拆掉暗刻。',
    highlight: '拆暗刻',
    icon: '⚠',
    color: '#c45a3a',
  },
];

export const AICoachScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* portrait background of AI coach (left side) */}
      <AICoachBackdrop />

      {/* mini phone fixed on far left, "carries over" Top1 from previous scene */}
      <MiniPhone frame={frame} />

      {/* AI explain pill being pressed */}
      <ExplainPill frame={frame} />

      {/* main chat panel sliding in from the right */}
      <ChatPanel frame={frame} fps={fps} />

      {/* late big caption */}
      <LateCaption frame={frame} />

      {/* "由 Claude 实时生成" badge */}
      <ClaudeBadge frame={frame} />
    </AbsoluteFill>
  );
};

const AICoachBackdrop: React.FC = () => {
  return (
    <>
      {/* deep teal void */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 28% 50%, ${COLORS.sage700} 0%, ${COLORS.sage900} 55%, #0a140d 100%)`,
        }}
      />
      {/* AI coach portrait fills the left 50%; right half stays empty for panel */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '60%',
          height: '100%',
          background: `center / cover no-repeat url(${staticFile('assets/gpt-ai-coach-portrait.png')})`,
          maskImage: 'linear-gradient(90deg, #000 0%, #000 70%, transparent 100%)',
          opacity: 0.92,
        }}
      />
      {/* faint gold particles */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const cx = 100 + ((i * 67) % 880);
          const cy = 220 + ((i * 113) % 1500);
          const r = 4 + (i % 3);
          return <circle key={i} cx={cx} cy={cy} r={r} fill={COLORS.gold} opacity={0.18} />;
        })}
      </svg>
    </>
  );
};

const MiniPhone: React.FC<{ frame: number }> = ({ frame }) => {
  const fade = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: 28,
        top: 950,
        width: 240,
        height: 410,
        borderRadius: 30,
        background: '#0e1a13',
        padding: 8,
        boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 3px ${COLORS.sage700}`,
        opacity: fade,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 24,
          overflow: 'hidden',
          background: COLORS.bgCream,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: COLORS.sage700,
            fontWeight: 800,
          }}
        >
          推荐 #1
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fff',
            border: `2px solid ${COLORS.gold}`,
            borderRadius: 12,
            padding: 8,
            boxShadow: `0 0 18px ${COLORS.gold}55`,
          }}
        >
          <MJTile code="5s" size={48} highlight />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.goldDeep }}>92 分</div>
            <div style={{ fontSize: 11, color: COLORS.sage700 }}>进张 22 种</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: COLORS.sage600,
            opacity: 0.7,
            marginTop: 'auto',
          }}
        >
          Top 6 出牌建议
        </div>
      </div>
    </div>
  );
};

const ExplainPill: React.FC<{ frame: number }> = ({ frame }) => {
  // 0–18  show pulsing
  // 18–24 quick scale-down "press"
  // 24+   fade out
  const pulse = 1 + Math.sin(frame * 0.4) * 0.04;
  const press = interpolate(frame, [PANEL_IN_FRAME - 4, PANEL_IN_FRAME], [1, 0.88], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [PANEL_IN_FRAME + 6, PANEL_IN_FRAME + 18], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ringR = interpolate(frame, [PANEL_IN_FRAME, PANEL_IN_FRAME + 16], [0, 110], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ringOp = interpolate(frame, [PANEL_IN_FRAME, PANEL_IN_FRAME + 16], [0.9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 290,
        top: 1100,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: '14px 28px',
          borderRadius: 999,
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDeep})`,
          color: '#fff',
          fontSize: 28,
          fontWeight: 900,
          boxShadow: `0 10px 30px ${COLORS.goldDeep}66`,
          transform: `scale(${pulse * press})`,
          letterSpacing: 1,
        }}
      >
        🤖 AI 解释
      </div>
      {/* expanding tap ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: ringR * 2,
          height: ringR * 2,
          marginLeft: -ringR,
          marginTop: -ringR,
          borderRadius: '50%',
          border: `5px solid ${COLORS.gold}`,
          opacity: ringOp,
        }}
      />
    </div>
  );
};

const ChatPanel: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const slide = spring({
    frame: frame - PANEL_IN_FRAME,
    fps,
    config: { damping: 20, stiffness: 100 },
  });
  const x = interpolate(slide, [0, 1], [620, 0]);
  const op = interpolate(slide, [0, 0.4], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 40,
        top: 360,
        width: 660,
        height: 1280,
        borderRadius: 32,
        padding: 28,
        background: `linear-gradient(180deg, rgba(44,85,53,0.92), rgba(251,253,247,0.96))`,
        backgroundImage: `url(${staticFile('assets/gpt-thought-bubble-bg.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `2px solid ${COLORS.sage400}88`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 60px ${COLORS.sage400}22`,
        transform: `translateX(${x}px)`,
        opacity: op,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar frame={frame} small />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.sage900 }}>
            AI 教练
          </div>
          <div style={{ fontSize: 18, color: COLORS.sage700, fontWeight: 600 }}>
            正在分析这一手 …
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: 999,
            background: `${COLORS.gold}aa`,
            color: COLORS.ink,
            fontSize: 16,
            fontWeight: 800,
            border: `1px solid ${COLORS.goldDeep}`,
          }}
        >
          为什么打 5s
        </div>
      </div>

      {/* three reasons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        {REASONS.map((r, i) => (
          <ReasonCard key={i} index={i} reason={r} frame={frame} />
        ))}
      </div>

      {/* tail conclusion */}
      <ConclusionLine frame={frame} />
    </div>
  );
};

const Avatar: React.FC<{ frame: number; small?: boolean; big?: boolean }> = ({
  frame,
  small,
  big,
}) => {
  const size = big ? 140 : small ? 70 : 100;
  const breathe = 1 + Math.sin(frame * 0.18) * 0.03;
  const localStart = AVATAR_IN_FRAME;
  const op = interpolate(frame, [localStart, localStart + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${COLORS.sage300}, ${COLORS.sage700} 70%)`,
        border: `3px solid ${COLORS.gold}aa`,
        boxShadow: `0 0 ${big ? 36 : 18}px ${COLORS.sage400}aa`,
        position: 'relative',
        overflow: 'hidden',
        opacity: op,
        transform: `scale(${breathe})`,
      }}
    >
      <img
        src={staticFile('assets/gpt-claude-avatar.png')}
        alt="AI"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {/* fallback "M" for missing avatar */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: size * 0.45,
          fontWeight: 900,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          opacity: 0.35,
        }}
      >
        ✦
      </div>
    </div>
  );
};

const ReasonCard: React.FC<{
  index: number;
  reason: (typeof REASONS)[number];
  frame: number;
}> = ({ index, reason, frame }) => {
  const start = TYPE_START + index * TYPE_BLOCK_DUR;
  const cardOp = interpolate(frame, [start - 6, start + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardY = interpolate(frame, [start - 6, start + 10], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // typewriter on body
  const charsRevealed = Math.max(0, Math.floor((frame - start - 4) * 0.9));
  const visibleBody = reason.body.slice(0, charsRevealed);

  // highlight pulse near the end of the typewriter
  const hlStart = start + Math.ceil(reason.body.length / 0.9) + 4;
  const hlPulse = interpolate(
    frame,
    [hlStart, hlStart + 8, hlStart + 24],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const bodyParts = visibleBody.split(reason.highlight);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: `2px solid ${reason.color}aa`,
        borderRadius: 20,
        padding: '16px 18px',
        opacity: cardOp,
        transform: `translateY(${cardY}px)`,
        boxShadow: `0 8px 22px ${COLORS.shadow}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: reason.color,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          {reason.icon}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: reason.color }}>
          {index + 1}. {reason.label}
        </div>
      </div>
      <div
        style={{
          fontSize: 24,
          lineHeight: 1.4,
          color: COLORS.ink,
          fontWeight: 600,
          minHeight: 70,
        }}
      >
        {bodyParts.length === 1 ? (
          visibleBody
        ) : (
          <>
            {bodyParts[0]}
            {visibleBody.includes(reason.highlight) && (
              <span
                style={{
                  display: 'inline-block',
                  background: `${COLORS.gold}${Math.round(hlPulse * 240)
                    .toString(16)
                    .padStart(2, '0')}`,
                  color: COLORS.goldDeep,
                  fontWeight: 900,
                  padding: '0 8px',
                  borderRadius: 6,
                  margin: '0 2px',
                  textShadow: hlPulse > 0.3 ? `0 0 12px ${COLORS.gold}` : 'none',
                }}
              >
                {reason.highlight}
              </span>
            )}
            {bodyParts[1] ?? ''}
          </>
        )}
        {/* blinking caret while typing this card */}
        {frame >= start && charsRevealed < reason.body.length && (
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 24,
              background: COLORS.sage700,
              marginLeft: 4,
              transform: 'translateY(4px)',
              opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
            }}
          />
        )}
      </div>
    </div>
  );
};

const ConclusionLine: React.FC<{ frame: number }> = ({ frame }) => {
  const start = TYPE_START + 3 * TYPE_BLOCK_DUR + 6;
  const op = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '14px 18px',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${COLORS.sage100}, ${COLORS.sage50})`,
        border: `1px dashed ${COLORS.sage400}`,
        color: COLORS.sage800,
        fontSize: 22,
        fontWeight: 800,
        opacity: op,
        textAlign: 'center',
      }}
    >
      ✓ 综合下来，5s 是这一手最稳的一打
    </div>
  );
};

const ClaudeBadge: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [BADGE_FRAME, BADGE_FRAME + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        right: 60,
        top: 320,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${COLORS.sage400}`,
        color: COLORS.sage800,
        fontSize: 18,
        fontWeight: 700,
        opacity: op,
        backdropFilter: 'blur(6px)',
      }}
    >
      由 Claude 实时生成
    </div>
  );
};

const LateCaption: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BIG_CAPTION_FRAME) return null;
  // Mount a fresh BigCaption from this frame so its own spring is fresh.
  // The component reads useCurrentFrame() relative to the parent <Sequence>;
  // since we're already inside the AICoach scene's sequence, we shift visually
  // by setting opacity from 0 until BIG_CAPTION_FRAME.
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: interpolate(frame, [BIG_CAPTION_FRAME, BIG_CAPTION_FRAME + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      }}
    >
      <BigCaption
        text="为什么是这一张"
        subText="AI 教练讲清楚"
        fadeOutAt={9999}
      />
    </div>
  );
};
