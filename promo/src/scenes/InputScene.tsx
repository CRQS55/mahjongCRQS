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

/**
 * 6–9s · input · "拍一下，或点一下"
 *
 * 0.0–1.0s  — phone shows camera viewfinder, gold scan line sweeps
 * 1.0–2.0s  — swipe-cut to true_add.png screenshot, three taps land in sequence
 * 2.0–3.0s  — caption + sub-line settle
 *
 * Required asset: promo/public/assets/true_add.png
 * Optional bg:    promo/public/assets/gpt-input-table.png
 */
const SWIPE_FRAME = 30; // 1s in
const TAP_TIMINGS = [42, 54, 66]; // taps land at 1.4 / 1.8 / 2.2s

const SCAN_TILES = ['2m', '5s', '7p', '4m', '8p', '3s'];

export const InputScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const swipeT = spring({
    frame: frame - SWIPE_FRAME,
    fps,
    config: { damping: 22, stiffness: 130 },
  });
  // 0 → camera; 1 → true_add screenshot
  const camOffsetX = interpolate(swipeT, [0, 1], [0, -1100]);
  const addOffsetX = interpolate(swipeT, [0, 1], [1100, 0]);

  return (
    <AbsoluteFill>
      {/* dark moody backdrop, blends into photo if available */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 70%, #1d3a25 0%, #0a140d 75%),
            url(${staticFile('assets/gpt-input-table.png')}) center/cover
          `,
          backgroundBlendMode: 'multiply',
        }}
      />
      {/* subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.sage400}22 1px, transparent 1px),
                            linear-gradient(90deg, ${COLORS.sage400}22 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          maskImage:
            'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%)',
          opacity: 0.6,
        }}
      />

      <BigCaption text="拍一下，或点一下" subText="怎么方便怎么来" />

      {/* phone, two stacked panels swiped horizontally */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 460,
          transform: 'translateX(-50%)',
        }}
      >
        <PhoneFrame width={760} height={1340}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              background: COLORS.bgCream,
            }}
          >
            {/* panel 1 — camera viewfinder */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateX(${camOffsetX}px)`,
                background: '#0e1a13',
              }}
            >
              <CameraPanel frame={frame} />
            </div>

            {/* panel 2 — manual add (true_add.png) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateX(${addOffsetX}px)`,
                background: COLORS.bgCream,
              }}
            >
              <TrueAddPanel frame={frame} />
            </div>
          </div>
        </PhoneFrame>
      </div>

      {/* mode chip top-right hint */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 14,
          opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <ModeChip label="📷 拍照识牌" active={frame < SWIPE_FRAME + 6} />
        <ModeChip label="✋ 手动点入" active={frame >= SWIPE_FRAME + 6} />
      </div>
    </AbsoluteFill>
  );
};

const ModeChip: React.FC<{ label: string; active: boolean }> = ({ label, active }) => {
  return (
    <div
      style={{
        padding: '10px 22px',
        borderRadius: 999,
        background: active ? COLORS.gold : 'rgba(255,255,255,0.18)',
        color: active ? COLORS.ink : '#fff',
        fontSize: 24,
        fontWeight: 800,
        border: `2px solid ${active ? COLORS.goldDeep : 'rgba(255,255,255,0.35)'}`,
        boxShadow: active ? `0 6px 18px ${COLORS.goldDeep}55` : 'none',
        transition: 'all .25s',
      }}
    >
      {label}
    </div>
  );
};

const CameraPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const beamY = interpolate(frame, [4, 30], [120, 920], {
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* viewfinder */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 120,
          bottom: 200,
          border: `4px dashed ${COLORS.gold}88`,
          borderRadius: 28,
          background:
            'radial-gradient(ellipse at center, #1d3a2588 0%, #0a140d 80%)',
        }}
      >
        {/* tile silhouettes inside viewfinder */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '40%',
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            transform: 'translateY(-50%)',
            opacity: 0.85,
          }}
        >
          {SCAN_TILES.map((c, i) => (
            <MJTile key={i} code={c} size={70} />
          ))}
        </div>
        {/* corner brackets */}
        {[
          { top: 12, left: 12, b: ['t', 'l'] },
          { top: 12, right: 12, b: ['t', 'r'] },
          { bottom: 12, left: 12, b: ['b', 'l'] },
          { bottom: 12, right: 12, b: ['b', 'r'] },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...c,
              width: 50,
              height: 50,
              borderTop: c.b.includes('t') ? `5px solid ${COLORS.gold}` : 'none',
              borderBottom: c.b.includes('b') ? `5px solid ${COLORS.gold}` : 'none',
              borderLeft: c.b.includes('l') ? `5px solid ${COLORS.gold}` : 'none',
              borderRight: c.b.includes('r') ? `5px solid ${COLORS.gold}` : 'none',
              boxShadow: `0 0 18px ${COLORS.gold}66`,
            }}
          />
        ))}
        {/* horizontal scan beam */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: beamY,
            height: 6,
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
            boxShadow: `0 0 40px 8px ${COLORS.gold}aa`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 80,
          textAlign: 'center',
          color: '#fff',
          fontSize: 26,
          fontWeight: 700,
          opacity: 0.9,
        }}
      >
        对准手牌，AI 自动识别
      </div>
    </div>
  );
};

const TrueAddPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - SWIPE_FRAME;

  // true_add.png is 965x640 landscape (~1.5:1). The phone panel is 760x~1300
  // portrait. We render the image as a centered card with object-fit: contain
  // so it never gets cropped, and overlay tap dots inside the image area.
  // Image card: 700px wide, ~464px tall, anchored at top: 320px in the panel.
  const IMG_W = 700;
  const IMG_H = Math.round(IMG_W / (965 / 640)); // ≈ 464
  const IMG_LEFT = (760 - IMG_W) / 2;
  const IMG_TOP = 300;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: COLORS.bgCream,
      }}
    >
      {/* heading */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 38,
          fontWeight: 900,
          color: COLORS.sage800,
          letterSpacing: 2,
        }}
      >
        手动加牌
      </div>
      <div
        style={{
          position: 'absolute',
          top: 160,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 22,
          color: COLORS.sage600,
          fontWeight: 600,
        }}
      >
        点击牌面，逐张录入
      </div>

      {/* image card — fully contained, never cropped */}
      <div
        style={{
          position: 'absolute',
          left: IMG_LEFT,
          top: IMG_TOP,
          width: IMG_W,
          height: IMG_H,
          borderRadius: 22,
          overflow: 'hidden',
          background: '#fff',
          border: `2px solid ${COLORS.sage200}`,
          boxShadow: `0 14px 40px ${COLORS.shadow}`,
        }}
      >
        <img
          src={staticFile('assets/true_add.png')}
          alt="手动加牌"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            background: '#fff',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0';
          }}
        />
      </div>

      {/* 3 cursor taps — positioned over the image card */}
      {TAP_TIMINGS.map((f, i) => {
        const dt = frame - f;
        const op = interpolate(dt, [-2, 0, 12, 22], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const ringR = interpolate(dt, [0, 22], [0, 70], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const ringOp = interpolate(dt, [0, 22], [0.85, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        // 3 tap points evenly distributed across the lower-middle of the image card
        const xPositions = [0.22, 0.5, 0.78]; // % across image width
        const yRel = 0.62;                    // % down image height
        const left = IMG_LEFT + IMG_W * xPositions[i];
        const top = IMG_TOP + IMG_H * yRel;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width: ringR * 2,
                height: ringR * 2,
                marginLeft: -ringR,
                marginTop: -ringR,
                borderRadius: '50%',
                border: `4px solid ${COLORS.gold}`,
                opacity: ringOp,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width: 36,
                height: 36,
                marginLeft: -18,
                marginTop: -18,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${COLORS.gold}, ${COLORS.goldDeep})`,
                boxShadow: `0 0 22px ${COLORS.gold}`,
                opacity: op,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* "已加 N 张" toast */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 80,
          transform: 'translateX(-50%)',
          padding: '14px 28px',
          borderRadius: 999,
          background: `${COLORS.sage700}ee`,
          color: '#fff',
          fontSize: 28,
          fontWeight: 800,
          opacity: interpolate(localFrame, [42, 56], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          boxShadow: `0 8px 24px ${COLORS.shadow}`,
        }}
      >
        ✓ 已加入 {Math.min(3, Math.max(0, Math.floor((localFrame - 12) / 12)))} 张
      </div>
    </div>
  );
};
