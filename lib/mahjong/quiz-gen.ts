/**
 * 带答案的随机手牌生成器（重构版）
 *
 * - genTenpaiHand：生成一副听牌的 13 张手牌（缺一门，标准型 / 七对），用严格听牌枚举给答案
 * - genNotenHand：生成一副未听的 14 张手牌；T2 模式答案使用 EV（综合期望收益）
 * - genGameScene：14 张 + 已可见弃牌；T3 模式答案使用 EV
 *
 * 区别：T1（听几张）使用严格听牌枚举；T2/T3 使用 EV 出牌建议
 */

import { CountArray, emptyCounts, indexToCode } from './tiles';
import {
  calcShanten,
  isWinningHand,
  enumerateWaitingTilesStrict
} from './analyzer';
import { suggestDiscardsByEv } from './ev';

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

/**
 * 检查手牌是否含 4 张相同（暗杠候选）
 * 测试题应过滤这种情况：暗杠才是最优选择，与"打哪张"题型不匹配
 */
function hasConcealedKong(counts: CountArray): boolean {
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] === 4) return true;
  }
  return false;
}

function pickTwoSuits(): [0 | 1 | 2, 0 | 1 | 2] {
  const drop = rand(3);
  const rest = [0, 1, 2].filter(s => s !== drop) as (0 | 1 | 2)[];
  return [rest[0], rest[1]];
}

function buildWinningHand(): { hand: CountArray; suits: (0 | 1 | 2)[] } {
  const suits = pickTwoSuits();
  const hand = emptyCounts();
  const pairSuit = suits[rand(2)];
  const pairRank = rand(9);
  hand[pairSuit * 9 + pairRank] += 2;
  for (let i = 0; i < 4; i++) {
    const s = suits[rand(2)];
    const useTriplet = rand(2) === 0;
    if (useTriplet) {
      const candidates: number[] = [];
      for (let r = 0; r < 9; r++) {
        const idx = s * 9 + r;
        if (hand[idx] + 3 <= 4) candidates.push(idx);
      }
      if (candidates.length > 0) {
        hand[candidates[rand(candidates.length)]] += 3;
        continue;
      }
    }
    const candidates: number[] = [];
    for (let r = 0; r <= 6; r++) {
      const i0 = s * 9 + r;
      if (hand[i0] < 4 && hand[i0 + 1] < 4 && hand[i0 + 2] < 4) candidates.push(i0);
    }
    if (candidates.length > 0) {
      const start = candidates[rand(candidates.length)];
      hand[start]++;
      hand[start + 1]++;
      hand[start + 2]++;
    } else {
      for (let r = 0; r < 9; r++) {
        const idx = s * 9 + r;
        if (hand[idx] + 3 <= 4) {
          hand[idx] += 3;
          break;
        }
      }
    }
  }
  return { hand, suits: suits.slice() };
}

/**
 * T1：生成一副听牌的 13 张手牌
 * 严格听牌枚举：只接受真实有胡张的手牌
 */
export function genTenpaiHand(): {
  handCodes: string[];
  waitingTiles: { code: string; remaining: number }[];
} {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { hand } = buildWinningHand();
    if (!isWinningHand(hand, 0)) continue;
    const candidates: number[] = [];
    for (let i = 0; i < hand.length; i++) {
      for (let k = 0; k < hand[i]; k++) candidates.push(i);
    }
    candidates.sort(() => Math.random() - 0.5);
    for (const idx of candidates) {
      const test = hand.slice();
      test[idx]--;
      if (hasConcealedKong(test)) continue; // 排除含 4 张相同的题目
      // 严格枚举，不依赖 shanten 公式
      const waits = enumerateWaitingTilesStrict(test, []);
      if (waits.length === 0) continue;
      const handCodes: string[] = [];
      for (let i = 0; i < test.length; i++) {
        for (let k = 0; k < test[i]; k++) handCodes.push(indexToCode(i));
      }
      return {
        handCodes,
        waitingTiles: waits.map(w => ({
          code: w.code,
          remaining: 4 - test[w.index]
        }))
      };
    }
  }
  throw new Error('genTenpaiHand failed');
}

/**
 * T2：生成一副 14 张未听手牌，使用 EV 算法给出 Top 5 答案
 */
export function genNotenHand(): {
  handCodes: string[];
  bestDiscards: { code: string; rank: number; effectiveCount: number; effectiveTiles: { code: string; remaining: number }[]; expectedScore: number; reasons: string[] }[];
  algorithm: 'expectedScore';
} {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { hand } = buildWinningHand();
    const flatIdx: number[] = [];
    for (let i = 0; i < hand.length; i++) for (let k = 0; k < hand[i]; k++) flatIdx.push(i);
    if (flatIdx.length !== 14) continue;
    const removeAt = flatIdx[rand(flatIdx.length)];
    const used: Set<number> = new Set();
    for (let i = 0; i < hand.length; i++) if (hand[i] > 0) used.add(Math.floor(i / 9));
    const usedSuits = Array.from(used) as (0 | 1 | 2)[];
    if (usedSuits.length === 0) continue;
    const newSuit = usedSuits[rand(usedSuits.length)];
    const newRank = rand(9);
    const newIdx = newSuit * 9 + newRank;
    const test = hand.slice();
    test[removeAt]--;
    if (test[newIdx] >= 4) continue;
    test[newIdx]++;
    if (hasConcealedKong(test)) continue; // 排除含 4 张相同的题目（暗杠题）
    if (isWinningHand(test, 0)) continue;
    const sh = calcShanten(test, 0);
    if (sh.shanten < 0 || sh.shanten > 2) continue;

    const remainingPool = emptyCounts().map((_, i) => 4 - test[i]);
    const totalUnseen = remainingPool.reduce((a, b) => a + b, 0);
    const evList = suggestDiscardsByEv(test, {
      hand: test,
      remainingPool,
      totalUnseen,
      melds: [],
      genMode: 'fan',
      fanCap: 5,
      baseScore: 1
    });
    const top = evList.slice(0, 5);
    if (top.length === 0) continue;

    const handCodes: string[] = [];
    for (let i = 0; i < test.length; i++) {
      for (let k = 0; k < test[i]; k++) handCodes.push(indexToCode(i));
    }
    return {
      handCodes,
      bestDiscards: top.map((s, i) => ({
        code: s.discardCode,
        rank: i + 1,
        effectiveCount: s.effectiveCount,
        effectiveTiles: s.effectiveTiles.map(t => ({ code: t.code, remaining: t.remaining })),
        expectedScore: parseFloat(s.expectedScore.toFixed(3)),
        reasons: s.reasons.slice(0, 4)
      })),
      algorithm: 'expectedScore'
    };
  }
  throw new Error('genNotenHand failed');
}

/**
 * T3：14 张 + 已可见弃牌，使用 EV 算法
 */
export function genGameScene(): {
  handCodes: string[];
  visibleCodes: string[];
  bestDiscards: { code: string; rank: number; effectiveCount: number; effectiveTiles: { code: string; remaining: number }[]; expectedScore: number; reasons: string[] }[];
  algorithm: 'expectedScore';
} {
  for (let attempt = 0; attempt < 200; attempt++) {
    const baseN = genNotenHand();
    const handCounts = emptyCounts();
    for (const c of baseN.handCodes) {
      const idx = (c[1] === 'm' ? 0 : c[1] === 's' ? 9 : 18) + parseInt(c[0]) - 1;
      handCounts[idx]++;
    }
    const visibleCount = 6 + rand(7);
    const visible = emptyCounts();
    let placed = 0;
    let tries = 0;
    while (placed < visibleCount && tries < 200) {
      tries++;
      const idx = rand(27);
      if (handCounts[idx] + visible[idx] >= 4) continue;
      visible[idx]++;
      placed++;
    }
    const visibleCodes: string[] = [];
    for (let i = 0; i < visible.length; i++) {
      for (let k = 0; k < visible[i]; k++) visibleCodes.push(indexToCode(i));
    }
    const remainingPool = emptyCounts().map((_, i) => Math.max(0, 4 - handCounts[i] - visible[i]));
    const totalUnseen = remainingPool.reduce((a, b) => a + b, 0);
    const evList = suggestDiscardsByEv(handCounts, {
      hand: handCounts,
      remainingPool,
      totalUnseen,
      melds: [],
      genMode: 'fan',
      fanCap: 5,
      baseScore: 1
    });
    const top = evList.slice(0, 5);
    if (top.length === 0) continue;
    return {
      handCodes: baseN.handCodes,
      visibleCodes,
      bestDiscards: top.map((s, i) => ({
        code: s.discardCode,
        rank: i + 1,
        effectiveCount: s.effectiveCount,
        effectiveTiles: s.effectiveTiles.map(t => ({ code: t.code, remaining: t.remaining })),
        expectedScore: parseFloat(s.expectedScore.toFixed(3)),
        reasons: s.reasons.slice(0, 4)
      })),
      algorithm: 'expectedScore'
    };
  }
  throw new Error('genGameScene failed');
}
