'use client';

import React from 'react';
import { MJTile } from './MJTile';

interface Props {
  onPick: (code: string) => void;
  size?: 'sm' | 'md';
  title?: string;
  hint?: string;
}

const ALL_CODES: string[] = (() => {
  const out: string[] = [];
  for (const s of ['m', 's', 'p'] as const) {
    for (let r = 1; r <= 9; r++) out.push(`${r}${s}`);
  }
  return out;
})();

export function TilePicker({ onPick, size = 'sm', title = '选择麻将牌', hint }: Props) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-sage-700">{title}</h3>
        {hint && <span className="text-xs text-sage-600">{hint}</span>}
      </div>
      <div className="space-y-2">
        {(['m', 's', 'p'] as const).map(suit => (
          <div key={suit} className="flex items-center gap-2">
            <span className="label-tag w-12 justify-center">
              {suit === 'm' ? '万' : suit === 's' ? '条' : '筒'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CODES.filter(c => c[1] === suit).map(c => (
                <MJTile key={c} code={c} size={size} onClick={() => onPick(c)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
