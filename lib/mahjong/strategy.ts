/**
 * 川麻开局 / 中盘助手：定缺 / 换三张 / 碰决策
 *
 * - dingque(hand)：建议缺哪一门 — 枚举三种缺门方案，比较"丢该门张数 + 剩两门 EV"
 * - swap3(hand)：换三张策略 — 选 3 张同色牌，最大化换出后的预期手牌质量
 * - shouldPong(hand, target)：别人打出 target 牌时是否应该碰
 */

import { CountArray, emptyCounts, indexToCode, codeToIndex, suitOfIndex } from './tiles';
import { calcShanten, isWinningHand, MeldDecl } from './analyzer';
import { suggestDiscardsByEv } from './ev';

// =============== 定缺建议 ===============

export interface DingqueSuggestion {
  /** 建议缺哪一门：'m'/'s'/'p' */
  suggestedDrop: 'm' | 's' | 'p';
  /** 三种方案的成本（越低越好） */
  options: {
    suit: 'm' | 's' | 'p';
    suitName: string;
    tilesInSuit: number;
    shantenAfter: number;
    /** 综合代价 = 张数 + 剩余两门向听 */
    cost: number;
    /** 是否包含强结构（暗刻/对子） */
    hasTriplets: boolean;
    hasPairs: number;
  }[];
  reasons: string[];
}

const SUIT_LABEL: Record<'m' | 's' | 'p', string> = { m: '万', s: '条', p: '筒' };

export function suggestDingque(hand: CountArray): DingqueSuggestion {
  const options: DingqueSuggestion['options'] = [];

  for (let suit = 0 as 0 | 1 | 2; suit <= 2; suit = ((suit + 1) | 0) as 0 | 1 | 2) {
    const adjusted = hand.slice();
    let tilesInSuit = 0;
    let triplets = 0;
    let pairs = 0;
    for (let i = 0; i < 27; i++) {
      if (suitOfIndex(i) === suit) {
        tilesInSuit += adjusted[i];
        if (adjusted[i] >= 3) triplets++;
        else if (adjusted[i] === 2) pairs++;
        adjusted[i] = 0;
      }
    }
    const shAfter = calcShanten(adjusted, 0).shanten;
    // 综合代价：张数 + 向听 - 已有强结构奖励
    const cost = tilesInSuit + Math.max(0, shAfter) - triplets * 2 - pairs * 0.5;
    options.push({
      suit: (['m', 's', 'p'] as const)[suit],
      suitName: SUIT_LABEL[(['m', 's', 'p'] as const)[suit]],
      tilesInSuit,
      shantenAfter: shAfter,
      cost,
      hasTriplets: triplets > 0,
      hasPairs: pairs
    });
    if (suit === 2) break;
  }

  options.sort((a, b) => a.cost - b.cost);
  const best = options[0];

  const reasons: string[] = [];
  reasons.push(`建议缺 ${best.suitName}：要打掉 ${best.tilesInSuit} 张，剩两门向听 ${best.shantenAfter}`);
  if (best.hasTriplets) reasons.push('该门含暗刻，丢掉损失较大但剩余结构更优');
  if (best.hasPairs > 0) reasons.push(`该门含 ${best.hasPairs} 对，可考虑保留转七对`);

  // 对比相邻方案
  const second = options[1];
  if (second && second.cost - best.cost < 1.5) {
    reasons.push(`备选缺 ${second.suitName}（成本接近，可灵活选择）`);
  }

  return {
    suggestedDrop: best.suit,
    options,
    reasons
  };
}

// =============== 换三张策略 ===============

export interface Swap3Suggestion {
  /** 建议换出的 3 张同色牌 */
  swapOut: { code: string; count: number }[];
  /** 换出后的预期向听数 */
  expectedShantenAfter: number;
  reasons: string[];
}

/**
 * 换三张：选 3 张同色，最大化"换出后剩余手牌的质量"
 * 简化：枚举每种 (suit, 3-tile-combination) 取剩余手牌向听最低
 */
export function suggestSwap3(hand: CountArray): Swap3Suggestion[] {
  const candidates: { tiles: number[]; remainingShanten: number; tilesScore: number }[] = [];

  // 枚举 3 张同色组合（限制枚举量）
  for (let suit = 0; suit < 3; suit++) {
    // 获取该门的牌
    const suitTiles: number[] = [];
    for (let r = 0; r < 9; r++) {
      const idx = suit * 9 + r;
      for (let k = 0; k < hand[idx]; k++) suitTiles.push(idx);
    }
    if (suitTiles.length < 3) continue;

    // 枚举该门内的 3 张组合（只看不同的牌型组合）
    for (let i = 0; i < suitTiles.length; i++) {
      for (let j = i + 1; j < suitTiles.length; j++) {
        for (let k = j + 1; k < suitTiles.length; k++) {
          const trial = hand.slice();
          trial[suitTiles[i]]--;
          trial[suitTiles[j]]--;
          trial[suitTiles[k]]--;
          if (trial[suitTiles[i]] < 0 || trial[suitTiles[j]] < 0 || trial[suitTiles[k]] < 0) continue;
          const sh = calcShanten(trial, 0).shanten;
          // 倾向打掉孤张/边张：1/9 比 4/5/6 价值低
          const tileScore = [suitTiles[i], suitTiles[j], suitTiles[k]].reduce((s, t) => {
            const r = t % 9;
            return s + (r === 0 || r === 8 ? 1 : r === 1 || r === 7 ? 0.5 : 0);
          }, 0);
          candidates.push({
            tiles: [suitTiles[i], suitTiles[j], suitTiles[k]],
            remainingShanten: sh,
            tilesScore: tileScore
          });
        }
      }
    }
  }

  // 排序：向听低优先 + 倾向丢边张
  candidates.sort((a, b) => {
    if (a.remainingShanten !== b.remainingShanten) return a.remainingShanten - b.remainingShanten;
    return b.tilesScore - a.tilesScore;
  });

  // 去重 + 取前 3
  const seen = new Set<string>();
  const top: Swap3Suggestion[] = [];
  for (const c of candidates) {
    const key = c.tiles.slice().sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const tileCount: Record<string, number> = {};
    for (const t of c.tiles) {
      const code = indexToCode(t);
      tileCount[code] = (tileCount[code] ?? 0) + 1;
    }
    top.push({
      swapOut: Object.entries(tileCount).map(([code, count]) => ({ code, count })),
      expectedShantenAfter: c.remainingShanten,
      reasons: [
        `换出后向听 ${c.remainingShanten}`,
        c.tilesScore >= 1.5 ? '主要是边张/幺九，损失较小' : '中张较多，需谨慎'
      ]
    });
    if (top.length >= 3) break;
  }
  return top;
}

// =============== 碰决策 ===============

export interface PongSuggestion {
  /** 是否建议碰 */
  shouldPong: boolean;
  /** 碰前 EV */
  evWithoutPong: number;
  /** 碰后 EV */
  evWithPong: number;
  reasons: string[];
}

/**
 * 别人打出 target 牌，自己手中有 ≥2 张 target，是否应碰？
 *
 * 算法：比较"碰后 14 张"（碰下来 + 摸打）的 EV vs "不碰当前 13 张"的 EV
 */
export function shouldPong(
  hand: CountArray,
  targetCode: string,
  melds: MeldDecl[],
  remainingPool: CountArray,
  totalUnseen: number,
  baseScore = 1,
  fanCap = 4,
  genMode: 'fan' | 'di' = 'fan'
): PongSuggestion {
  const targetIdx = codeToIndex(targetCode);
  if (targetIdx === null || hand[targetIdx] < 2) {
    return {
      shouldPong: false,
      evWithoutPong: 0,
      evWithPong: 0,
      reasons: ['手中不足 2 张 target，无法碰']
    };
  }

  // 不碰：当前手牌为 13 张（已被对家拿走），保持向听
  const sh = calcShanten(hand, melds.length, melds);
  const evWithoutPong = -sh.shanten * 0.5; // 简单启发式：向听越深越差

  // 碰：手中减 2 张 target，melds + 1 副 pung，再要打掉一张
  const afterPong = hand.slice();
  afterPong[targetIdx] -= 2;
  const newMelds: MeldDecl[] = [...melds, { type: 'pung', tile: targetCode }];

  const evList = suggestDiscardsByEv(afterPong, {
    hand: afterPong,
    remainingPool,
    totalUnseen,
    melds: newMelds,
    genMode,
    fanCap,
    baseScore
  });

  const evWithPong = evList.length > 0 ? evList[0].expectedScore : 0;

  const reasons: string[] = [];
  if (evWithPong > evWithoutPong + 0.3) {
    reasons.push(`碰后预期 EV ${evWithPong.toFixed(2)}，明显优于不碰 ${evWithoutPong.toFixed(2)}`);
    reasons.push(`碰后建议打 ${evList[0]?.discardCode}：${evList[0]?.reasons[0] ?? ''}`);
  } else if (evWithPong > evWithoutPong) {
    reasons.push(`碰后 EV 略高（${evWithPong.toFixed(2)} vs ${evWithoutPong.toFixed(2)}），可考虑碰`);
  } else {
    reasons.push(`碰后 EV 反而下降（${evWithPong.toFixed(2)} vs ${evWithoutPong.toFixed(2)}），建议不碰`);
    reasons.push('保留对子可能用于七对/暗刻升级');
  }

  return {
    shouldPong: evWithPong > evWithoutPong + 0.2,
    evWithoutPong,
    evWithPong,
    reasons
  };
}
