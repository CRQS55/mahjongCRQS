import React from 'react';
import { COLORS } from '../constants';

interface PhoneFrameProps {
  width?: number;
  height?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** TODO: replace with real screenshot — pass the staticFile() URL */
  bgImage?: string;
}

/**
 * Lightweight phone mockup that hosts either a real screenshot
 * (`bgImage`) or a faux UI (`children`).
 */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  width = 720,
  height = 1480,
  children,
  bgImage,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 64,
        background: '#0e1a13',
        padding: 14,
        boxShadow: `0 30px 80px ${COLORS.shadow}, 0 0 0 4px ${COLORS.sage700}`,
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 52,
          overflow: 'hidden',
          background: bgImage
            ? `center / cover no-repeat url(${bgImage})`
            : COLORS.bgCream,
          position: 'relative',
        }}
      >
        {/* notch */}
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 180,
            height: 28,
            borderRadius: 999,
            background: '#0e1a13',
            zIndex: 4,
          }}
        />
        {children}
      </div>
    </div>
  );
};
