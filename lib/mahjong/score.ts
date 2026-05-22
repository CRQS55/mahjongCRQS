/**
 * 段位与排行榜（localStorage）
 */

export interface ScoreRecord {
  total: number;
  testsCompleted: number;
  history: { type: 't1' | 't2' | 't3'; delta: number; at: number }[];
  updatedAt: number;
}

const KEY = 'sichuan-mahjong-score-v1';

export const RANKS: { name: string; min: number; max: number; color: string }[] = [
  { name: '黑铁', min: 0, max: 9, color: '#5c5c5c' },
  { name: '青铜', min: 10, max: 29, color: '#a87340' },
  { name: '白银', min: 30, max: 59, color: '#9aa3ad' },
  { name: '黄金', min: 60, max: 99, color: '#d4a017' },
  { name: '铂金', min: 100, max: 149, color: '#5cb3a3' },
  { name: '钻石', min: 150, max: 209, color: '#3b8de1' },
  { name: '超凡', min: 210, max: 279, color: '#a052d4' },
  { name: '神话', min: 280, max: 359, color: '#e15050' },
  { name: '赋能', min: 360, max: Infinity, color: '#52a062' }
];

export function getRank(score: number): { name: string; color: string; index: number; nextAt?: number } {
  for (let i = 0; i < RANKS.length; i++) {
    const r = RANKS[i];
    if (score >= r.min && score <= r.max) {
      return { name: r.name, color: r.color, index: i, nextAt: r.max === Infinity ? undefined : r.max + 1 };
    }
  }
  return { name: '黑铁', color: '#5c5c5c', index: 0, nextAt: 10 };
}

export function loadRecord(): ScoreRecord {
  if (typeof window === 'undefined') {
    return { total: 0, testsCompleted: 0, history: [], updatedAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { total: 0, testsCompleted: 0, history: [], updatedAt: Date.now() };
    const r = JSON.parse(raw);
    return {
      total: typeof r.total === 'number' ? r.total : 0,
      testsCompleted: typeof r.testsCompleted === 'number' ? r.testsCompleted : 0,
      history: Array.isArray(r.history) ? r.history.slice(-100) : [],
      updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now()
    };
  } catch {
    return { total: 0, testsCompleted: 0, history: [], updatedAt: Date.now() };
  }
}

export function saveRecord(record: ScoreRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {}
}

export function addScore(type: 't1' | 't2' | 't3', delta: number): ScoreRecord {
  const r = loadRecord();
  r.total = Math.max(0, r.total + delta);
  r.testsCompleted++;
  r.history.push({ type, delta, at: Date.now() });
  if (r.history.length > 100) r.history = r.history.slice(-100);
  r.updatedAt = Date.now();
  saveRecord(r);
  return r;
}

export function resetRecord(): ScoreRecord {
  const empty: ScoreRecord = { total: 0, testsCompleted: 0, history: [], updatedAt: Date.now() };
  saveRecord(empty);
  return empty;
}

/**
 * 评分公式
 *
 * T1（听几张）：
 *   选对所有听张        +2
 *   部分对              +(命中数 / 总听张数) * 2
 *   完全错              -1
 *
 * T2/T3（出哪张）：
 *   命中 Top1           +1.0
 *   命中 Top2           +0.8
 *   命中 Top3           +0.6
 *   命中 Top4           +0.4
 *   命中 Top5           +0.2
 *   完全不在 Top5       -0.5
 */
export function scoreT1(answerCodes: string[], correctCodes: string[]): number {
  const ans = new Set(answerCodes);
  const cor = new Set(correctCodes);
  const hits = [...cor].filter(c => ans.has(c)).length;
  const wrongs = [...ans].filter(c => !cor.has(c)).length;
  if (hits === 0) return -1;
  if (hits === cor.size && wrongs === 0) return 2;
  // 部分对：命中比例 × 2，但每个错选 -0.3
  const base = (hits / cor.size) * 2 - wrongs * 0.3;
  return Math.max(-1, Math.min(2, parseFloat(base.toFixed(2))));
}

export function scoreT2OrT3(answerCode: string, topList: { code: string; rank: number }[]): number {
  const idx = topList.findIndex(t => t.code === answerCode);
  if (idx < 0) return -0.5;
  const map = [1.0, 0.8, 0.6, 0.4, 0.2];
  return map[idx] ?? 0.1;
}
