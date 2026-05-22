'use client';

import React from 'react';

/**
 * 麻将牌组件：直接用 public/tiles/{code}.png
 */

export interface MJTileProps {
  code: string; // "5m" / "9p"
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  dim?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  badge?: string | number;
}

const SIZES = {
  sm: { w: 38, h: 52 },
  md: { w: 50, h: 68 },
  lg: { w: 66, h: 90 }
} as const;

export function MJTile({ code, size = 'md', removable, dim, highlight, onClick, badge }: MJTileProps) {
  if (!code || code.length !== 2) return null;
  const rank = parseInt(code[0], 10);
  const suit = code[1];
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) return null;
  if (suit !== 'm' && suit !== 's' && suit !== 'p') return null;

  const { w, h } = SIZES[size];
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        'mj-tile-img',
        removable ? 'removable' : '',
        dim ? 'dim' : '',
        highlight ? 'highlight' : ''
      ].filter(Boolean).join(' ')}
      style={{ width: w, height: h, position: 'relative', cursor: onClick ? 'pointer' : 'default' }}
    >
      <img
        src={`/tiles/${code}.png`}
        alt={code}
        width={w}
        height={h}
        draggable={false}
        style={{ display: 'block', width: '100%', height: '100%', borderRadius: 6, userSelect: 'none' }}
      />
      {removable && (
        <span className="remove-x">×</span>
      )}
      {badge !== undefined && badge !== null && (
        <span
          style={{
            position: 'absolute', bottom: -6, right: -6,
            background: '#52a062', color: 'white',
            borderRadius: 8, fontSize: 10,
            padding: '1px 5px', lineHeight: 1.2, whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
          }}
        >{badge}</span>
      )}
    </div>
  );
}
