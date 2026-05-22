/**
 * 四川麻将胡牌判断与向听数算法
 *
 * 算法参考：
 * - 标准胡牌型：4 面子(刻/顺) + 1 对将
 * - 七对：7 个对子
 * - 龙七对：含至少 1 个 4 张相同 + 6 个对子（计算时按 4 张拆为 2 对处理）
 * - 缺一门：胡牌时手牌只能有 m/s/p 中的两种
 *
 * 向听数（Shanten）：距离听牌还差多少张牌的最小数。
 *   听牌时 shanten = 0；胡牌时 shanten = -1。
 *
 * 标准型按花色分别枚举所有"面子+搭子"分解，使用记忆化 DP。
 */

import {
  CountArray,
  TILE_KIND_COUNT,
  cloneCounts,
  totalTiles,
  suitOfIndex
} from './tiles';

// =============== 一门花色的最优分解（面子数, 搭子数）枚举 ===============
//
// 输入：长度 9 的 CountArray（一门花色 1..9 的张数）
// 用 DP/递归：枚举 1..9 处取顺/刻/搭子/对子/单张，返回所有可能的 (mentsu, taatsu)
// 出于效率，每个花色独立枚举，最终用 DP 合并三门。

interface SuitDecomp {
  mentsu: number; // 完整面子数
  taatsu: number; // 搭子数（含对子用作将候选时的特殊处理由外层做）
  hasPair: boolean; // 该分解里是否包含一个对子（候选将）
}

function decomposeSuit(counts: number[]): SuitDecomp[] {
  // counts.length === 9
  const results: SuitDecomp[] = [];
  const seen = new Set<string>();

  function rec(c: number[], mentsu: number, taatsu: number, hasPair: boolean) {
    // 找到第一张非零
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

    // 不利用 i 上的牌（直接当孤张丢弃）
    const skip = c.slice();
    skip[i] = 0;
    rec(skip, mentsu, taatsu, hasPair);

    // 刻子
    if (c[i] >= 3) {
      const n = c.slice();
      n[i] -= 3;
      rec(n, mentsu + 1, taatsu, hasPair);
    }
    // 顺子
    if (i + 2 < 9 && c[i] >= 1 && c[i + 1] >= 1 && c[i + 2] >= 1) {
      const n = c.slice();
      n[i]--;
      n[i + 1]--;
      n[i + 2]--;
      rec(n, mentsu + 1, taatsu, hasPair);
    }
    // 对子（搭子之一）
    if (c[i] >= 2) {
      const n = c.slice();
      n[i] -= 2;
      // 对子既能算搭子也能当将；这里把"是否有对子"标记保留，外层再决定
      rec(n, mentsu, taatsu + 1, true);
    }
    // 两面/嵌张/边张搭子
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

  // 剪枝：保留每种 (mentsu, taatsu, hasPair) 的最优表示已经唯一
  return results;
}

// 缓存按花色 counts 的 key
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
//
// shanten = (4 - mentsu) * 2 - taatsu_used - (有将 ? 1 : 0)
// 约束：mentsu + taatsu_used <= 4；taatsu_used 是被采用的搭子数（不超过 4 - mentsu）
// 若没有将候选 hasPair，则上式中"有将"为 0。
// 标准定义见经典向听算法。

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
        // 已碰/杠的面子直接计入 mentsu 总数
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
function chitoitsuShanten(counts: CountArray): number {
  let pairs = 0;
  let kinds = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] >= 2) pairs++;
    if (counts[i] >= 1) kinds++;
  }
  // 七对需要 7 种不同的对子，所以 kinds 必须 >= 7
  // shanten = 6 - pairs + max(0, 7 - kinds)
  let s = 6 - pairs;
  if (kinds < 7) s += 7 - kinds;
  return s;
}

// =============== 缺一门约束 ===============
function suitsUsed(counts: CountArray): boolean[] {
  const used = [false, false, false];
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] > 0) used[suitOfIndex(i)] = true;
  }
  return used;
}

// 缺一门时合法：使用花色种类 <= 2
export function isMissingOneSuit(counts: CountArray): boolean {
  const used = suitsUsed(counts);
  return used.filter(x => x).length <= 2;
}

// 若不满足缺一门，则把任意一门去掉后取最小向听
// 真实计算：尝试丢弃 m/s/p 三门各自所有牌，加上"还需要打掉这些牌"作为额外步数
// 但这里我们采用更标准的做法：要求 counts 已经满足缺一门；否则向听数加上"打掉最少那一门张数"的代价（保守估计）
function missingOneSuitPenalty(counts: CountArray): { adjusted: CountArray; penalty: number; chosenDrop?: 0 | 1 | 2 } {
  const used = suitsUsed(counts);
  const usedCount = used.filter(x => x).length;
  if (usedCount <= 2) return { adjusted: counts, penalty: 0 };

  // 三门都用了，必须丢一门：选丢最少的那一门
  let bestPenalty = Infinity;
  let bestSuit: 0 | 1 | 2 = 0;
  let bestAdjusted = counts;
  for (let suit = 0 as 0 | 1 | 2; suit < 3; suit = (suit + 1) as 0 | 1 | 2) {
    let cnt = 0;
    const adjusted = counts.slice();
    for (let i = 0; i < TILE_KIND_COUNT; i++) {
      if (suitOfIndex(i) === suit) {
        cnt += adjusted[i];
        adjusted[i] = 0;
      }
    }
    if (cnt < bestPenalty) {
      bestPenalty = cnt;
      bestSuit = suit;
      bestAdjusted = adjusted;
    }
    if (suit === 2) break;
  }
  return { adjusted: bestAdjusted, penalty: bestPenalty, chosenDrop: bestSuit };
}

// =============== 综合向听数（含四川麻将缺一门规则） ===============
export interface ShantenResult {
  shanten: number; // -1 = 已胡，0 = 听牌，>=1 = 向听
  type: 'standard' | 'chitoitsu' | 'mixed';
  needDropSuit?: 'm' | 's' | 'p'; // 若三门齐，建议舍弃的一门
}

export function calcShanten(counts: CountArray, meldCount: number = 0): ShantenResult {
  const total = totalTiles(counts);

  const { adjusted, penalty, chosenDrop } = missingOneSuitPenalty(counts);

  const standard = standardShantenFromCounts(adjusted, meldCount) + penalty;
  // 七对在已碰/杠时不可能成立
  const chitoiTotal = meldCount === 0 ? chitoitsuShanten(adjusted) + penalty : 99;

  let best = Math.min(standard, chitoiTotal);
  let type: 'standard' | 'chitoitsu' | 'mixed' = standard <= chitoiTotal ? 'standard' : 'chitoitsu';

  return {
    shanten: best,
    type,
    needDropSuit: chosenDrop !== undefined ? (['m', 's', 'p'] as const)[chosenDrop] : undefined
  };
}

// =============== 胡牌判定（14 张直接判） ===============
export function isWinningHand(counts: CountArray, meldCount: number = 0): boolean {
  if (!isMissingOneSuit(counts)) return false;
  const total = totalTiles(counts);
  // 标准型：(4-meldCount) 面子 + 1 将；总牌数应为 (4-meldCount)*3 + 2
  const expectedStandard = (4 - meldCount) * 3 + 2;
  if (total === expectedStandard && checkStandardWin(counts, meldCount)) return true;
  // 七对仅在 meldCount=0 时成立
  if (meldCount === 0 && total === 14 && checkChitoitsuWin(counts)) return true;
  return false;
}

function checkStandardWin(counts: CountArray, meldCount: number = 0): boolean {
  const needMentsu = 4 - meldCount;
  // 选一个对子作将，剩下分解为 needMentsu 个面子
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] >= 2) {
      const c = counts.slice();
      c[i] -= 2;
      if (canDecomposeAllMentsu(c, needMentsu)) return true;
    }
  }
  return false;
}

function canDecomposeAllMentsu(counts: CountArray, needMentsu: number): boolean {
  // 三门独立判断：每门必须能完全分解为顺/刻；总和等于 needMentsu * 3
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
  // 全部分解为顺/刻
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

  // 刻子
  if (c[i] >= 3) {
    const n = c.slice();
    n[i] -= 3;
    if (suitCanAllMentsu(n)) {
      suitMentsuCache.set(key, true);
      return true;
    }
  }
  // 顺子
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

function checkChitoitsuWin(counts: CountArray): boolean {
  // 14 张：要么 7 对（每种恰好 2），要么含 4 张相同的"龙七对"（4 张视为 2 对）
  let pairs = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (counts[i] === 2) pairs++;
    else if (counts[i] === 4) pairs += 2;
    else if (counts[i] !== 0) return false;
  }
  return pairs === 7;
}

// =============== 听牌枚举 ===============
//
// 13 张时：枚举每张可能的进张 t（0..26），加上后是否胡牌
// 返回所有能胡的 t 列表 + 每张胡牌后的牌型类型
export interface WaitingTile {
  index: number;
  code: string;
  winType: 'standard' | 'chitoitsu';
}

export function enumerateWaitingTiles(counts: CountArray, meldCount: number = 0): WaitingTile[] {
  const waits: WaitingTile[] = [];
  for (let t = 0; t < TILE_KIND_COUNT; t++) {
    if (counts[t] >= COPIES_PER_TILE_LIMIT) continue;
    const next = counts.slice();
    next[t]++;
    if (isWinningHand(next, meldCount)) {
      const isChitoi =
        meldCount === 0 &&
        !checkStandardWin(next, 0) &&
        checkChitoitsuWin(next);
      waits.push({
        index: t,
        code: `${(t % 9) + 1}${'msp'[Math.floor(t / 9)]}`,
        winType: isChitoi ? 'chitoitsu' : 'standard'
      });
    }
  }
  return waits;
}
const COPIES_PER_TILE_LIMIT = 4;

// =============== 出牌建议（向听数 + 进张数） ===============
//
// 当手牌 14 张（含刚摸到的）或听牌+1 时：
// 枚举每张可能的弃牌 d，剩下 13 张算向听 + 有效进张
//
// 对于 14 张未听情形：选出"打出后向听最低"且"有效进张数最多"的弃牌
// 返回 Top N 建议
export interface DiscardSuggestion {
  discard: number; // tile index
  discardCode: string;
  shantenAfter: number;
  effectiveTiles: { index: number; code: string; remaining: number }[];
  effectiveCount: number; // 总有效进张数（按剩余计入）
  probability?: number; // 摸到任意一张有效进张的概率（0-1）
  isWin?: boolean; // 是否本身已是胡牌（无需打）
}

export function suggestDiscards(
  hand: CountArray,
  remainingPool: CountArray,
  meldCount: number = 0
): DiscardSuggestion[] {
  const suggestions: DiscardSuggestion[] = [];

  for (let d = 0; d < TILE_KIND_COUNT; d++) {
    if (hand[d] === 0) continue;
    const after = hand.slice();
    after[d]--;

    const sh = calcShanten(after, meldCount);

    const eff: { index: number; code: string; remaining: number }[] = [];
    for (let t = 0; t < TILE_KIND_COUNT; t++) {
      if (after[t] >= COPIES_PER_TILE_LIMIT) continue;
      const trial = after.slice();
      trial[t]++;
      const sh2 = calcShanten(trial, meldCount);
      if (sh2.shanten < sh.shanten || (sh.shanten === -1 && sh2.shanten === -1)) {
        const rem = remainingPool ? Math.max(0, remainingPool[t]) : (4 - after[t]);
        eff.push({
          index: t,
          code: `${(t % 9) + 1}${'msp'[Math.floor(t / 9)]}`,
          remaining: rem
        });
      }
    }

    suggestions.push({
      discard: d,
      discardCode: `${(d % 9) + 1}${'msp'[Math.floor(d / 9)]}`,
      shantenAfter: sh.shanten,
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
// 每种 4 张，减去手牌中已用，再减去玩家声明的"已知打出/可见"
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
