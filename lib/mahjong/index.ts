/**
 * 顶层分析入口：根据玩家手牌（含/不含刚摸的牌）+ 已知出过的牌
 * 返回完整的判断结果。
 */

import {
  CountArray,
  countsFromCodes,
  emptyCounts,
  totalTiles,
  tileDisplay,
  indexToCode
} from './tiles';
import {
  calcShanten,
  isWinningHand,
  enumerateWaitingTiles,
  suggestDiscards,
  defaultRemainingPool,
  isMissingOneSuit,
  WaitingTile,
  DiscardSuggestion,
  ShantenResult
} from './analyzer';
import { computeFan, settle, GenMode, FanResult } from './scoring';

export type Phase = 'win' | 'tenpai' | 'noten';

export interface AnalysisInput {
  handCodes: string[]; // 手牌（不含已碰/杠的牌；可含刚摸的牌）
  visibleCodes?: string[]; // 已知打出/可见的牌（用于估算剩余张数）
  meldCount?: number; // 兼容旧字段：已碰/杠的副数（不含具体牌）
  melds?: { type: 'pung' | 'kong'; tile: string }[]; // 推荐用法：已碰/杠的具体牌
  isHaidi?: boolean; // 海底捞月
  genMode?: GenMode; // 根：加番 / 加底
  baseScore?: number; // 底分（用于结算）
  fanCap?: number; // 番数封顶
}

export interface WinAnalysis {
  phase: Phase;
  shanten: ShantenResult;
  isWin: boolean;
  waitingTiles?: (WaitingTile & { remaining: number; fan?: number })[]; // 听牌情形（带每张胡牌的番数预估）
  suggestedDiscards?: DiscardSuggestion[]; // 未听情形：建议出牌
  warnings: string[];
  handSummary: string; // 手牌摘要
  remainingPoolHint?: { code: string; remaining: number }[]; // 关键牌剩余
  fan?: FanResult; // 已胡牌时的番数明细
  settlement?: { perPlayer: number; detail: string };
}

export function analyze(input: AnalysisInput): WinAnalysis {
  const warnings: string[] = [];
  const hand = countsFromCodes(input.handCodes);
  const visible = countsFromCodes(input.visibleCodes ?? []);
  const melds = input.melds ?? [];
  const meldCount = melds.length > 0 ? melds.length : (input.meldCount ?? 0);
  const genMode = input.genMode ?? 'fan';
  const baseScore = input.baseScore ?? 1;
  const fanCap = input.fanCap ?? 4;
  const isHaidi = input.isHaidi ?? false;

  // 已碰/杠的牌必须从牌池中扣除
  const meldTiles = emptyCounts();
  for (const m of melds) {
    const idx = parseInt(m.tile[0]) - 1 + (m.tile[1] === 'm' ? 0 : m.tile[1] === 's' ? 9 : 18);
    if (idx >= 0 && idx < 27) {
      meldTiles[idx] += m.type === 'kong' ? 4 : 3;
    }
  }
  // 用于番种判断的"完整牌型"：手牌 + 已碰/杠的牌
  const fullHand = hand.slice();
  for (let i = 0; i < fullHand.length; i++) fullHand[i] += meldTiles[i];

  const handTotal = totalTiles(hand);
  const expectedTenpai = 13 - meldCount * 3;
  const expectedDrawn = 14 - meldCount * 3;

  if (handTotal !== expectedTenpai && handTotal !== expectedDrawn) {
    warnings.push(
      `手牌 ${handTotal} 张（已碰/杠 ${meldCount} 副），加起来 ${handTotal + meldCount * 3} 张。常规应为 13 张听牌 / 14 张待出。请检查输入是否完整`
    );
  }

  if (!isMissingOneSuit(hand)) {
    warnings.push('手牌涉及三门花色，四川麻将要求胡牌时缺一门，需要打掉其中一门');
  }

  const handSummary = handCodesToHumanReadable(input.handCodes);

  // 计算剩余牌池：从 4 张/种里扣除手牌、可见牌、以及已碰/杠的牌
  const visibleAll = visible.slice();
  for (let i = 0; i < visibleAll.length; i++) visibleAll[i] += meldTiles[i];
  const remainingPool = defaultRemainingPool(hand, visibleAll);
  const totalUnseen = remainingPool.reduce((a, b) => a + b, 0); // 我看不到的所有牌总数

  // 给每张牌附加剩余张数 + 概率
  const annotateProb = (effective: { remaining: number }[]) => {
    const total = effective.reduce((s, e) => s + e.remaining, 0);
    return totalUnseen > 0 ? total / totalUnseen : 0;
  };

  // ===== 通用判定：先尝试"加一张是否胡" =====
  // 这种判法不依赖 shanten 公式，对任意手牌张数都能给出正确听牌结论
  const directWaits: { index: number; code: string; winType: 'standard' | 'chitoitsu' }[] = [];
  for (let t = 0; t < 27; t++) {
    if (hand[t] >= 4) continue;
    const trial = hand.slice();
    trial[t]++;
    if (isWinningHand(trial, meldCount)) {
      directWaits.push({
        index: t,
        code: indexToCode(t),
        winType: meldCount === 0 && !checkStandardWinDirect(trial) ? 'chitoitsu' : 'standard'
      });
    }
  }

  // 如果当前手牌已经直接胡（14 张 = 14 - meld*3 + meld*3）
  if (isWinningHand(hand, meldCount)) {
    const fan = computeFan({ hand: fullHand, meldCount, isHaidi, genMode });
    const settlement = settle(baseScore, fan, fanCap);
    return {
      phase: 'win',
      shanten: { shanten: -1, type: 'standard' },
      isWin: true,
      warnings,
      handSummary,
      suggestedDiscards: undefined,
      remainingPoolHint: topPoolHints(remainingPool),
      fan,
      settlement
    };
  }

  // 如果加一张能胡 → 听牌
  if (directWaits.length > 0) {
    const waits = directWaits.map(w => {
      const winFull = fullHand.slice();
      winFull[w.index]++;
      const fan = computeFan({ hand: winFull, meldCount, isHaidi, genMode });
      return {
        ...w,
        remaining: remainingPool[w.index],
        fan: fan.totalFan
      };
    });
    return {
      phase: 'tenpai',
      shanten: { shanten: 0, type: 'standard' },
      isWin: false,
      waitingTiles: waits,
      warnings,
      handSummary,
      remainingPoolHint: topPoolHints(remainingPool)
    };
  }

  // ===== 14 张待出（已摸） =====
  if (handTotal === expectedDrawn) {
    const sh = calcShanten(hand, meldCount);
    const sugg = suggestDiscards(hand, remainingPool, meldCount).slice(0, 8).map(s => ({
      ...s,
      probability: totalUnseen > 0 ? s.effectiveCount / totalUnseen : 0
    }));
    return {
      phase: sh.shanten === 0 ? 'tenpai' : 'noten',
      shanten: sh,
      isWin: false,
      suggestedDiscards: sugg,
      warnings,
      handSummary,
      remainingPoolHint: topPoolHints(remainingPool)
    };
  }

  // ===== 其他：未听，给进张提示 =====
  const sh = calcShanten(hand, meldCount);
  const sugg13 = suggestProgressFromTenpaiMinusOne(hand, remainingPool, meldCount).map(s => ({
    ...s,
    probability: totalUnseen > 0 ? s.effectiveCount / totalUnseen : 0
  }));
  return {
    phase: 'noten',
    shanten: sh,
    isWin: false,
    suggestedDiscards: sugg13,
    warnings: [...warnings, '当前未下叫，参考有效进张提示'],
    handSummary,
    remainingPoolHint: topPoolHints(remainingPool)
  };
}

// 直接用 isWinningHand 但仅判 14 张全在手里的情形
function checkStandardWinDirect(c: CountArray): boolean {
  return isWinningHand(c, 0);
}

function suggestProgressFromTenpaiMinusOne(
  hand: CountArray,
  remainingPool: CountArray,
  meldCount: number = 0
): DiscardSuggestion[] {
  const baseShanten = calcShanten(hand, meldCount).shanten;
  const eff: { index: number; code: string; remaining: number }[] = [];
  for (let t = 0; t < 27; t++) {
    if (hand[t] >= 4) continue;
    const trial = hand.slice();
    trial[t]++;
    const sh = calcShanten(trial, meldCount).shanten;
    if (sh < baseShanten) {
      eff.push({
        index: t,
        code: indexToCode(t),
        remaining: Math.max(0, remainingPool[t])
      });
    }
  }
  return [
    {
      discard: -1,
      discardCode: '—',
      shantenAfter: baseShanten,
      effectiveTiles: eff.sort((a, b) => b.remaining - a.remaining),
      effectiveCount: eff.reduce((a, b) => a + b.remaining, 0)
    }
  ];
}

function handCodesToHumanReadable(codes: string[]): string {
  // 按花色分组排序
  const groups: { m: number[]; s: number[]; p: number[] } = { m: [], s: [], p: [] };
  for (const c of codes) {
    if (c.length !== 2) continue;
    const r = parseInt(c[0], 10);
    const s = c[1];
    if (s === 'm' || s === 's' || s === 'p') groups[s].push(r);
  }
  groups.m.sort((a, b) => a - b);
  groups.s.sort((a, b) => a - b);
  groups.p.sort((a, b) => a - b);
  const labels: Record<'m' | 's' | 'p', string> = { m: '万', s: '条', p: '筒' };
  const parts: string[] = [];
  for (const k of ['m', 's', 'p'] as const) {
    if (groups[k].length === 0) continue;
    parts.push(groups[k].join('') + labels[k]);
  }
  return parts.join(' ');
}

function topPoolHints(pool: CountArray): { code: string; remaining: number }[] {
  const arr = pool.map((r, i) => ({ code: indexToCode(i), remaining: r }));
  return arr.filter(x => x.remaining < 4).sort((a, b) => a.remaining - b.remaining).slice(0, 6);
}
