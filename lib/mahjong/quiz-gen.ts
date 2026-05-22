/**
 * 带答案的随机手牌生成器
 *
 * - genTenpaiHand：生成一副听牌的 13 张手牌（缺一门，标准型），返回手牌+答案
 * - genNotenHand：生成一副未听的 14 张手牌（向听=1 比较常见，需要打一张）
 * - genGameScene：生成 14 张手牌 + 一些已可见的弃牌
 */

import { CountArray, emptyCounts, indexToCode, TILE_KIND_COUNT } from './tiles';
import { calcShanten, isWinningHand, enumerateWaitingTiles, suggestDiscards } from './analyzer';

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

// 随机选两门花色（缺一门）
function pickTwoSuits(): [0 | 1 | 2, 0 | 1 | 2] {
  const drop = rand(3);
  const rest = [0, 1, 2].filter(s => s !== drop) as (0 | 1 | 2)[];
  return [rest[0], rest[1]];
}

// 在两门花色范围内随机抽 n 张牌（每种 ≤ 4）
function randomTilesInSuits(suits: (0 | 1 | 2)[], n: number, exclude?: CountArray): CountArray {
  const counts = emptyCounts();
  if (exclude) for (let i = 0; i < counts.length; i++) counts[i] = -exclude[i]; // 临时记账
  let placed = 0;
  let tries = 0;
  while (placed < n && tries < 500) {
    tries++;
    const suit = suits[rand(suits.length)];
    const rank = rand(9);
    const idx = suit * 9 + rank;
    const limit = 4 - (exclude ? exclude[idx] : 0);
    if (counts[idx] - (exclude ? -exclude[idx] : 0) >= limit) continue;
    counts[idx]++;
    placed++;
  }
  if (exclude) for (let i = 0; i < counts.length; i++) counts[i] += exclude[i]; // 还原
  return counts;
}

// 拼一个完整 14 张胡牌：4 面子 + 1 将（在两门花色内）
function buildWinningHand(): { hand: CountArray; suits: (0 | 1 | 2)[] } {
  const suits = pickTwoSuits();
  const hand = emptyCounts();
  // 选将
  const pairSuit = suits[rand(2)];
  const pairRank = rand(9);
  hand[pairSuit * 9 + pairRank] += 2;
  // 4 个面子
  for (let i = 0; i < 4; i++) {
    const s = suits[rand(2)];
    const useTriplet = rand(2) === 0;
    if (useTriplet) {
      // 找一张能再放 3 张的
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
    // 顺子
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
      // 退而求其次：放刻子
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
 * 生成一副听牌的 13 张手牌
 */
export function genTenpaiHand(): {
  handCodes: string[];
  waitingTiles: { code: string; remaining: number }[]; // 答案
} {
  for (let attempt = 0; attempt < 50; attempt++) {
    const { hand } = buildWinningHand();
    if (!isWinningHand(hand, 0)) continue;
    // 移除一张：尽量不要留只听一张的（无聊），但也接受
    const candidates: number[] = [];
    for (let i = 0; i < hand.length; i++) {
      for (let k = 0; k < hand[i]; k++) candidates.push(i);
    }
    // 随机洗牌然后试，找一个移除后向听=0 且 listening>=1 的
    candidates.sort(() => Math.random() - 0.5);
    for (const idx of candidates) {
      const test = hand.slice();
      test[idx]--;
      const sh = calcShanten(test, 0);
      if (sh.shanten === 0) {
        const waits = enumerateWaitingTiles(test, 0);
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
  }
  // 兜底：return last attempt's hand even if not perfect
  throw new Error('genTenpaiHand failed');
}

/**
 * 生成一副 14 张未听手牌（向听=1，意味着打掉一张能听）
 */
export function genNotenHand(): {
  handCodes: string[];
  bestDiscards: { code: string; rank: number; effectiveCount: number }[]; // Top 5 答案
} {
  for (let attempt = 0; attempt < 80; attempt++) {
    const { hand } = buildWinningHand();
    // 在保持缺一门内随机 +1 替换（变成 14 张但稍微"乱"一点）
    // 找一张可以增加的：将 hand 里的某张 -1，换另一张随机进来
    const flatIdx: number[] = [];
    for (let i = 0; i < hand.length; i++) for (let k = 0; k < hand[i]; k++) flatIdx.push(i);
    if (flatIdx.length !== 14) continue;
    const removeAt = flatIdx[rand(flatIdx.length)];
    // 哪两个花色被使用
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
    // 14 张，看是否未胡
    if (isWinningHand(test, 0)) continue;
    const sh = calcShanten(test, 0);
    if (sh.shanten < 0 || sh.shanten > 2) continue;
    // 给出 Top 5 出牌建议（正确答案）
    const remainingPool = emptyCounts().map((_, i) => 4 - test[i]);
    const sugg = suggestDiscards(test, remainingPool, 0).filter(s => s.effectiveCount > 0).slice(0, 5);
    if (sugg.length === 0) continue;
    const handCodes: string[] = [];
    for (let i = 0; i < test.length; i++) {
      for (let k = 0; k < test[i]; k++) handCodes.push(indexToCode(i));
    }
    return {
      handCodes,
      bestDiscards: sugg.map((s, i) => ({
        code: s.discardCode,
        rank: i + 1,
        effectiveCount: s.effectiveCount
      }))
    };
  }
  throw new Error('genNotenHand failed');
}

/**
 * 生成一副"牌局"：14 张手牌 + 若干张已可见弃牌
 */
export function genGameScene(): {
  handCodes: string[];
  visibleCodes: string[]; // 桌面已经看到的牌
  bestDiscards: { code: string; rank: number; effectiveCount: number }[];
} {
  for (let attempt = 0; attempt < 80; attempt++) {
    const baseN = genNotenHand();
    // 随机生成 6-12 张可见牌（不能与手牌冲突，也不能全部是手牌缺的那门）
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
    // 重新算考虑可见牌的 Top 出牌
    const remainingPool = emptyCounts().map((_, i) => Math.max(0, 4 - handCounts[i] - visible[i]));
    const handArr = baseN.handCodes;
    const handCountsArr = emptyCounts();
    for (const c of handArr) {
      const idx = (c[1] === 'm' ? 0 : c[1] === 's' ? 9 : 18) + parseInt(c[0]) - 1;
      handCountsArr[idx]++;
    }
    const sugg = suggestDiscards(handCountsArr, remainingPool, 0).filter(s => s.effectiveCount > 0).slice(0, 5);
    if (sugg.length === 0) continue;
    return {
      handCodes: baseN.handCodes,
      visibleCodes,
      bestDiscards: sugg.map((s, i) => ({
        code: s.discardCode,
        rank: i + 1,
        effectiveCount: s.effectiveCount
      }))
    };
  }
  throw new Error('genGameScene failed');
}
