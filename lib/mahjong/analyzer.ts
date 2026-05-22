/**
 * 四川麻将胡牌判断与向听数算法（重构版）
 *
 * 重要修正：
 * 1. 拆分胡牌函数：isStandardWinningHand / isSevenPairsWinningHand / isLongChitoitsuWinningHand
 * 2. 听牌枚举严格化：enumerateWaitingTilesStrict —— 直接用胡牌枚举验证，不靠 shanten 公式
 * 3. 缺一门：melds 必须参与；不再仅看张数最少的那一门
 * 4. suggestDiscards 在 shantenAfter === 0 时强制走严格枚举验证真听张
 */

import {
  CountArray,
  TILE_KIND_COUNT,
  cloneCounts,
  totalTiles,
  suitOfIndex
} from './tiles';

// =============== 一门花色的最优分解（面子数, 搭子数）枚举 ===============

interface SuitDecomp {
  mentsu: number;
  taatsu: number;
  hasPair: boolean;
}

function decomposeSuit(counts: number[]): SuitDecomp[] {
  const results: SuitDecomp[] = [];
  const seen = new Set<string>();

  function rec(c: number[], mentsu: number, taatsu: number, hasPair: boolean) {
    let i = 0;
    while (i < 9 && c[i] === 0) i++;
    if (i >= 9) {
      const key = `${mentsu},${taatsu},${hasPair ? 1 : 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ mentsu, taatsu, hasPair });
      }
      return;
    }

    const skip = c.slice();
    skip[i] = 0;
    rec(skip, mentsu, taatsu, hasPair);

    if (c[i] >= 3) {
      const n = c.slice();
      n[i] -= 3;
      rec(n, mentsu + 1, taatsu, hasPair);
    }
    if (i + 2 < 9 && c[i] >= 1 && c[i + 1] >= 1 && c[i + 2] >= 1) {
      const n = c.slice();
      n[i]--;
      n[i + 1]--;
      n[i + 2]--;
      rec(n, mentsu + 1, taatsu, hasPair);
    }
    if (c[i] >= 2) {
      const n = c.slice();
      n[i] -= 2;
      rec(n, mentsu, taatsu + 1, true);
    }
    if (i + 1 < 9 && c[i] >= 1 && c[i + 1] >= 1) {
      const n = c.slice();
      n[i]--;
      n[i + 1]--;
      rec(n, mentsu, taatsu + 1, hasPair);
    }
    if (i + 2 < 9 && c[i] >= 1 && c[i + 2] >= 1) {
      const n = c.slice();
      n[i]--;
      n[i + 2]--;
      rec(n, mentsu, taatsu + 1, hasPair);
    }
  }

  rec(counts.slice(), 0, 0, false);
  return results;
}

const suitCache = new Map<string, SuitDecomp[]>();
function decomposeSuitCached(counts: number[]): SuitDecomp[] {
  const key = counts.join(',');
  let r = suitCache.get(key);
  if (!r) {
    r = decomposeSuit(counts);
    suitCache.set(key, r);
  }
  return r;
}

// =============== 标准型向听数 ===============

function standardShantenFromCounts(counts: CountArray, meldCount: number = 0): number {
  const m = counts.slice(0, 9);
  const s = counts.slice(9, 18);
  const p = counts.slice(18, 27);

  const dm = decomposeSuitCached(m);
  const ds = decomposeSuitCached(s);
  const dp = decomposeSuitCached(p);

  let best = 8;
  for (const a of dm) {
    for (const b of ds) {
      for (const c of dp) {
        const totalMentsu = a.mentsu + b.mentsu + c.mentsu + meldCount;
        const totalTaatsu = a.taatsu + b.taatsu + c.taatsu;
        const hasPair = a.hasPair || b.hasPair || c.hasPair;

        let useTaatsu = Math.min(totalTaatsu, 4 - totalMentsu);
        if (useTaatsu < 0) useTaatsu = 0;

        const pairBonus = hasPair ? 1 : 0;
        let shanten = (4 - totalMentsu) * 2 - useTaatsu - pairBonus;

        if (shanten < best) best = shanten;
      }
    }
  }
  return best;
}

// =============== 七对 / 龙七对 向听数 ===============
//
// 七对/龙七对的"对单元"统计口径（与 scoring.ts chitoitsuInfo 一致）：
//   counts[i] === 2 → 1 个 pair unit
//   counts[i] === 4 → 2 个 pair units（龙七对的 4 张相同算作两个对子）
//   counts[i] === 3 → 1 个 pair unit（额外那张是孤张/进张待定）
// 不强制要求 7 个不同 tile kinds：龙七对 6 种甚至更少种类即可凑成 7 对。
export function countPairUnits(counts: CountArray): number {
  let units = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] === 4) units += 2;
    else if (counts[i] === 2 || counts[i] === 3) units += 1;
  }
  return units;
}

function chitoitsuShanten(counts: CountArray): number {
  // 13 张状态距离七对成立（7 对 = 14 张）的"还差几次进张"
  // 每多一个 pair unit 减 1 步；不足 7 时与 6-pairUnits 取上限避免负值
  const pairs = countPairUnits(counts);
  return Math.max(0, 6 - pairs);
}

// =============== 缺一门约束（包含 melds） ===============

export interface MeldDecl {
  type: 'pung' | 'kong';
  tile: string;
}

export function suitsUsedInHandPlusMelds(hand: CountArray, melds: MeldDecl[] = []): boolean[] {
  const used = [false, false, false];
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] > 0) used[suitOfIndex(i)] = true;
  }
  for (const m of melds) {
    const code = m.tile;
    if (code.length !== 2) continue;
    const suitChar = code[1];
    const suit = suitChar === 'm' ? 0 : suitChar === 's' ? 1 : 2;
    used[suit] = true;
  }
  return used;
}

export function isMissingOneSuit(counts: CountArray, melds: MeldDecl[] = []): boolean {
  const used = suitsUsedInHandPlusMelds(counts, melds);
  return used.filter(x => x).length <= 2;
}

// =============== 胡牌判定 —— 拆分版本 ===============

export function isStandardWinningHand(counts: CountArray, meldCount: number = 0): boolean {
  const total = totalTiles(counts);
  const expected = (4 - meldCount) * 3 + 2;
  if (total !== expected) return false;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] >= 2) {
      const c = counts.slice();
      c[i] -= 2;
      if (canDecomposeAllMentsu(c, 4 - meldCount)) return true;
    }
  }
  return false;
}

export function isSevenPairsWinningHand(counts: CountArray): boolean {
  const total = totalTiles(counts);
  if (total !== 14) return false;
  let pairs = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] === 2) pairs++;
    else if (counts[i] === 4) pairs += 2;
    else if (counts[i] !== 0) return false;
  }
  return pairs === 7;
}

export function isLongChitoitsuWinningHand(counts: CountArray): boolean {
  if (!isSevenPairsWinningHand(counts)) return false;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] === 4) return true;
  }
  return false;
}

/**
 * 综合胡牌判定，含缺一门约束（如有 melds 则同时验证）
 */
export function isWinningHand(
  counts: CountArray,
  meldCount: number = 0,
  melds: MeldDecl[] = []
): boolean {
  if (!isMissingOneSuit(counts, melds)) return false;
  if (isStandardWinningHand(counts, meldCount)) return true;
  if (meldCount === 0 && isSevenPairsWinningHand(counts)) return true;
  return false;
}

function canDecomposeAllMentsu(counts: CountArray, needMentsu: number): boolean {
  let total = 0;
  for (const c of counts) total += c;
  if (total !== needMentsu * 3) return false;
  for (let s = 0; s < 3; s++) {
    const sub = counts.slice(s * 9, s * 9 + 9);
    if (!suitCanAllMentsu(sub)) return false;
  }
  return true;
}

const suitMentsuCache = new Map<string, boolean>();
function suitCanAllMentsu(c: number[]): boolean {
  const total = c.reduce((a, b) => a + b, 0);
  if (total % 3 !== 0) return false;
  if (total === 0) return true;
  const key = c.join(',');
  const cached = suitMentsuCache.get(key);
  if (cached !== undefined) return cached;

  let i = 0;
  while (i < 9 && c[i] === 0) i++;
  if (i >= 9) {
    suitMentsuCache.set(key, true);
    return true;
  }

  if (c[i] >= 3) {
    const n = c.slice();
    n[i] -= 3;
    if (suitCanAllMentsu(n)) {
      suitMentsuCache.set(key, true);
      return true;
    }
  }
  if (i + 2 < 9 && c[i] >= 1 && c[i + 1] >= 1 && c[i + 2] >= 1) {
    const n = c.slice();
    n[i]--;
    n[i + 1]--;
    n[i + 2]--;
    if (suitCanAllMentsu(n)) {
      suitMentsuCache.set(key, true);
      return true;
    }
  }
  suitMentsuCache.set(key, false);
  return false;
}

// =============== 综合向听数（含四川麻将缺一门规则） ===============

export interface ShantenResult {
  shanten: number;
  type: 'standard' | 'chitoitsu' | 'mixed';
  needDropSuit?: 'm' | 's' | 'p';
}

/**
 * 缺一门惩罚：枚举三种可能的"丢哪一门"，返回成本最低的方案
 * 成本 = 该门张数（要打掉的牌数） + 剩下两门的向听数
 */
function chooseMissingSuit(
  counts: CountArray,
  meldCount: number,
  melds: MeldDecl[]
): { adjusted: CountArray; penalty: number; chosenDrop?: 0 | 1 | 2 } {
  const used = suitsUsedInHandPlusMelds(counts, melds);
  const usedCount = used.filter(x => x).length;
  if (usedCount <= 2) {
    return { adjusted: counts, penalty: 0 };
  }

  // 三门齐时：必须丢一门
  // 但如果 melds 已经在某门里有牌，丢那一门是不可能的（成本无穷）
  const meldSuits = new Set<0 | 1 | 2>();
  for (const m of melds) {
    const ch = m.tile[1];
    meldSuits.add(ch === 'm' ? 0 : ch === 's' ? 1 : 2);
  }

  let bestCost = Infinity;
  let bestSuit: 0 | 1 | 2 = 0;
  let bestAdjusted = counts;
  for (let suit = 0 as 0 | 1 | 2; suit <= 2; suit = ((suit + 1) | 0) as 0 | 1 | 2) {
    if (meldSuits.has(suit)) {
      // 该门已被碰/杠过，无法"丢掉这一门"
      if (suit === 2) break;
      continue;
    }
    let cnt = 0;
    const adjusted = counts.slice();
    for (let i = 0; i < TILE_KIND_COUNT; i++) {
      if (suitOfIndex(i) === suit) {
        cnt += adjusted[i];
        adjusted[i] = 0;
      }
    }
    const remainShanten = standardShantenFromCounts(adjusted, meldCount);
    const cost = cnt + Math.max(0, remainShanten);
    if (cost < bestCost) {
      bestCost = cost;
      bestSuit = suit;
      bestAdjusted = adjusted;
    }
    if (suit === 2) break;
  }
  return { adjusted: bestAdjusted, penalty: bestCost === Infinity ? 99 : bestCost - standardShantenFromCounts(bestAdjusted, meldCount), chosenDrop: bestSuit };
}

export function calcShanten(
  counts: CountArray,
  meldCount: number = 0,
  melds: MeldDecl[] = []
): ShantenResult {
  const { adjusted, penalty, chosenDrop } = chooseMissingSuit(counts, meldCount, melds);

  const standard = standardShantenFromCounts(adjusted, meldCount) + penalty;
  const chitoiTotal = meldCount === 0 ? chitoitsuShanten(adjusted) + penalty : 99;

  let best = Math.min(standard, chitoiTotal);
  let type: 'standard' | 'chitoitsu' | 'mixed' = standard <= chitoiTotal ? 'standard' : 'chitoitsu';

  return {
    shanten: best,
    type,
    needDropSuit: chosenDrop !== undefined ? (['m', 's', 'p'] as const)[chosenDrop] : undefined
  };
}

// =============== 严格听牌枚举 ===============
//
// 不依赖 shanten 公式：直接对每一种可能的进张 t 调用 isWinningHand 验证
// 这是听牌真实性的"最终判官"

export interface WaitingTile {
  index: number;
  code: string;
  winType: 'standard' | 'chitoitsu' | 'longChitoitsu';
}

const COPIES_PER_TILE_LIMIT = 4;

export function enumerateWaitingTilesStrict(
  counts: CountArray,
  melds: MeldDecl[] = []
): WaitingTile[] {
  const meldCount = melds.length;
  const waits: WaitingTile[] = [];

  for (let t = 0; t < TILE_KIND_COUNT; t++) {
    if (counts[t] >= COPIES_PER_TILE_LIMIT) continue;
    const next = counts.slice();
    next[t]++;

    if (!isWinningHand(next, meldCount, melds)) continue;

    let winType: 'standard' | 'chitoitsu' | 'longChitoitsu' = 'standard';
    if (meldCount === 0 && isSevenPairsWinningHand(next)) {
      winType = isLongChitoitsuWinningHand(next) ? 'longChitoitsu' : 'chitoitsu';
      // 标准胡也成立时：优先标记为 chitoitsu（如果 standard 也成立，UI 可同时显示）
      if (isStandardWinningHand(next, 0)) {
        // 两者都成立时，按照番数取大者
        // 暂时优先标记 standard 还是 chitoitsu？番数比较交给上层 computeFan
        // 这里保留 chitoitsu 标记，因为它结构上"更窄"
      }
    }
    waits.push({
      index: t,
      code: `${(t % 9) + 1}${'msp'[Math.floor(t / 9)]}`,
      winType
    });
  }
  return waits;
}

/**
 * 兼容旧接口名
 */
export function enumerateWaitingTiles(counts: CountArray, meldCount: number = 0): WaitingTile[] {
  return enumerateWaitingTilesStrict(counts, []);
}

// =============== 出牌建议（基础——速度优先） ===============

export interface DiscardSuggestionBase {
  discard: number;
  discardCode: string;
  shantenAfter: number;
  effectiveTiles: { index: number; code: string; remaining: number }[];
  effectiveCount: number;
  probability?: number;
  isWin?: boolean;
}

/**
 * 给定 14 张状态：枚举打掉哪张后能真实听牌
 * @param keepGen 若给定，则要求结果牌型至少保留 keepGen 个根
 */
function canReachRealTenpaiByOneDiscard(
  drawn: CountArray,
  melds: MeldDecl[],
  keepGen?: number
): boolean {
  for (let d = 0; d < TILE_KIND_COUNT; d++) {
    if (drawn[d] === 0) continue;
    const after = drawn.slice();
    after[d]--;
    if (keepGen !== undefined) {
      let g = 0;
      for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 4) g++;
      if (g < keepGen) continue;
    }
    const waits = enumerateWaitingTilesStrict(after, melds);
    if (waits.length > 0) return true;
  }
  return false;
}

/**
 * 速度模式：按 shanten 升序 + effectiveCount 降序排序
 * 关键修正：shantenAfter === 0 时使用严格听牌枚举验证真听张；
 *            若公式给 0 但实际无真听张，shantenAfter 修正为 1，并枚举"摸什么能真下叫"
 */
export function suggestDiscards(
  hand: CountArray,
  remainingPool: CountArray,
  meldCount: number = 0,
  melds: MeldDecl[] = []
): DiscardSuggestionBase[] {
  const suggestions: DiscardSuggestionBase[] = [];

  for (let d = 0; d < TILE_KIND_COUNT; d++) {
    if (hand[d] === 0) continue;
    const after = hand.slice();
    after[d]--;

    const sh = calcShanten(after, meldCount, melds);
    let shantenAfter = sh.shanten;

    let eff: { index: number; code: string; remaining: number }[] = [];

    if (shantenAfter === 0) {
      const realWaits = enumerateWaitingTilesStrict(after, melds);
      eff = realWaits.map(w => ({
        index: w.index,
        code: w.code,
        remaining: remainingPool ? Math.max(0, remainingPool[w.index]) : Math.max(0, 4 - after[w.index])
      }));

      if (eff.length === 0) {
        // 公式认为听牌但实际无真听张：修正为 1 向听
        shantenAfter = 1;
        let baseGen = 0;
        for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 4) baseGen++;
        for (let t = 0; t < TILE_KIND_COUNT; t++) {
          if (after[t] >= COPIES_PER_TILE_LIMIT) continue;
          const drawn = after.slice();
          drawn[t]++;
          if (canReachRealTenpaiByOneDiscard(drawn, melds, baseGen)) {
            eff.push({
              index: t,
              code: `${(t % 9) + 1}${'msp'[Math.floor(t / 9)]}`,
              remaining: remainingPool ? Math.max(0, remainingPool[t]) : (4 - after[t])
            });
          }
        }
      }
    } else {
      let baseGen = 0;
      for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 4) baseGen++;
      for (let t = 0; t < TILE_KIND_COUNT; t++) {
        if (after[t] >= COPIES_PER_TILE_LIMIT) continue;
        const trial = after.slice();
        trial[t]++;
        const sh2 = calcShanten(trial, meldCount, melds);
        if (sh2.shanten < shantenAfter) {
          if (sh2.shanten === 0 && !canReachRealTenpaiByOneDiscard(trial, melds, baseGen)) continue;
          const rem = remainingPool ? Math.max(0, remainingPool[t]) : (4 - after[t]);
          eff.push({
            index: t,
            code: `${(t % 9) + 1}${'msp'[Math.floor(t / 9)]}`,
            remaining: rem
          });
        }
      }
    }

    suggestions.push({
      discard: d,
      discardCode: `${(d % 9) + 1}${'msp'[Math.floor(d / 9)]}`,
      shantenAfter,
      effectiveTiles: eff,
      effectiveCount: eff.reduce((a, b) => a + b.remaining, 0)
    });
  }

  suggestions.sort((a, b) => {
    if (a.shantenAfter !== b.shantenAfter) return a.shantenAfter - b.shantenAfter;
    return b.effectiveCount - a.effectiveCount;
  });
  return suggestions;
}

// =============== 默认剩余牌墙 ===============
export function defaultRemainingPool(
  hand: CountArray,
  visibleDiscards: CountArray
): CountArray {
  const pool = new Array(TILE_KIND_COUNT).fill(0).map((_, i) => {
    const used = hand[i] + (visibleDiscards[i] || 0);
    return Math.max(0, COPIES_PER_TILE_LIMIT - used);
  });
  return pool;
}

// 兼容旧 API
export type DiscardSuggestion = DiscardSuggestionBase;
