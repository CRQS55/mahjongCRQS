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
 * 7-12s — scan & recognize
 * Row of physical mahjong tiles, scan beam sweeps L→R, then digital tiles
 * fly into the phone screen.
 * TODO: replace tile-row backdrop with promo/public/assets/gpt-scanning-hand.png
 */
const SCAN_TILES = ['2m', '5s', '7p', '4m', '8p', '3s', '6m', '9p', '1s', '5m'];

export const ScanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beamX = interpolate(frame, [10, 75], [-200, 1280], {
    extrapolateRight: 'clamp',
  });
  const flyStart = 80;

  return (
    <AbsoluteFill style={{ background: '#0e1a13' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 40%, #1d3a25 0%, #0a140d 75%)',
        }}
      />
      {/* faint grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.sage400}22 1px, transparent 1px),
                            linear-gradient(90deg, ${COLORS.sage400}22 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          maskImage:
            'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%)',
        }}
      />

      <BigCaption text="AI 识牌，自动录入" />

      {/* physical tile row */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 760,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          padding: '20px 0',
        }}
      >
        {SCAN_TILES.map((c, i) => {
          // each tile flies up to the phone after scan beam passes it
          const myFlyFrame = flyStart + i * 4;
          const flyT = spring({
            frame: frame - myFlyFrame,
            fps,
            config: { damping: 14, stiffness: 90 },
          });
          const dy = interpolate(flyT, [0, 1], [0, -440]);
          const dx = interpolate(flyT, [0, 1], [0, (i - SCAN_TILES.length / 2) * -28]);
          const opacity = 1 - flyT * 0.2;
          return (
            <div
              key={i}
              style={{
                transform: `translate(${dx}px, ${dy}px) scale(${1 - flyT * 0.4})`,
                opacity,
              }}
            >
              <MJTile code={c} size={90} />
            </div>
          );
        })}
      </div>

      {/* scan beam */}
      {frame < flyStart && (
        <div
          style={{
            position: 'absolute',
            left: beamX,
            top: 700,
            width: 8,
            height: 280,
            background: `linear-gradient(180deg, transparent, ${COLORS.gold}, transparent)`,
            boxShadow: `0 0 60px 20px ${COLORS.gold}`,
          }}
        />
      )}

      {/* phone landing target at top */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 320,
          transform: 'translateX(-50%) scale(0.55)',
          transformOrigin: 'top center',
          opacity: interpolate(frame, [40, 80], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <PhoneFrame width={680} height={920}>
          <FauxScanResult frame={frame} />
        </PhoneFrame>
      </div>

      {/* corner reticle */}
      <Reticle frame={frame} />
    </AbsoluteFill>
  );
};

const Reticle: React.FC<{ frame: number }> = ({ frame }) => {
  const fade = interpolate(frame, [10, 30, 75, 90], [0, 1, 1, 0]);
  const corners = [
    [120, 720], [960, 720], [120, 1100], [960, 1100],
  ];
  return (
    <>
      {corners.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 50,
            height: 50,
            borderTop: i < 2 ? `5px solid ${COLORS.gold}` : 'none',
            borderBottom: i >= 2 ? `5px solid ${COLORS.gold}` : 'none',
            borderLeft: i % 2 === 0 ? `5px solid ${COLORS.gold}` : 'none',
            borderRight: i % 2 === 1 ? `5px solid ${COLORS.gold}` : 'none',
            opacity: fade,
            boxShadow: `0 0 20px ${COLORS.gold}66`,
          }}
        />
      ))}
    </>
  );
};

const FauxScanResult: React.FC<{ frame: number }> = ({ frame }) => {
  const recognized = SCAN_TILES.slice(0, Math.min(SCAN_TILES.length, Math.max(0, frame - 80)));
  return (
    <div
      style={{
        height: '100%',
        background: COLORS.bgCream,
        padding: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.sage700 }}>
        识别结果 · {recognized.length}/14
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          background: COLORS.sage50,
          padding: 18,
          borderRadius: 16,
          minHeight: 380,
          alignContent: 'flex-start',
        }}
      >
        {recognized.map((c, i) => (
          <MJTile key={i} code={c} size={70} />
        ))}
      </div>
    </div>
  );
};
