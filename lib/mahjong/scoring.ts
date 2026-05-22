/**
 * 四川麻将番种与分数结算（重构版）
 *
 * 重要修正：
 * 1. computeFan 明确区分 concealed / melds / fullHand / winningTile / winMethod
 * 2. 金钩钓基于结构（4 副明刻/杠 + 单吊对子），而不是 fullHand 的总张数
 * 3. 根的统计明确包含：手中 4 张 / 暗杠 / 明杠
 * 4. 龙七对的"4 张那一组"不再额外算根（已在番种里体现）
 */

import { CountArray, TILE_KIND_COUNT, suitOfIndex, indexToCode, codeToIndex } from './tiles';

export type GenMode = 'fan' | 'di';
export type WinMethod = 'discard' | 'tsumo';

export interface MeldInfo {
  type: 'pung' | 'kong'; // pung=碰（明刻），kong=明杠/暗杠（如需区分见 isConcealed）
  tile: string;
  isConcealed?: boolean; // 暗杠
}

export interface FanContext {
  /** 仅手中持牌（含刚胡的那张），不包含已碰/杠 */
  concealed: CountArray;
  /** 已碰/杠的具体面子 */
  melds: MeldInfo[];
  /** concealed + melds 的合并视图，用于番种判断（清一色等） */
  fullHand: CountArray;
  /** 胡到的那张牌 code（可选，用于扩展） */
  winningTile?: string;
  /** 自摸 / 点炮 */
  winMethod?: WinMethod;
  isHaidi?: boolean;
  /** 杠上花：杠完后从牌墙补的牌直接胡（自摸） */
  isAfterKong?: boolean;
  /** 杠上炮：刚杠完后打出的牌被别人胡（点炮方加 1 番） */
  isKongDischarge?: boolean;
  /** 抢杠胡：别人补杠的牌正是自己胡的牌 */
  isRobKong?: boolean;
  /** 天胡：庄家发完牌（含自己摸的第 14 张）后直接胡，仅庄家可成立，+6 番 */
  isHeavenly?: boolean;
  /** 地胡：闲家第一摸即胡（其间庄家与上家未碰未杠），+6 番 */
  isEarthly?: boolean;
  genMode: GenMode;
}

export interface FanResult {
  fans: { name: string; value: number }[];
  totalFan: number;
  extraDi: number;
  description: string;
  /** 估算到的"根"数 */
  genCount: number;
}

// =============== 番种判定（基于 concealed + melds 的明确结构） ===============

/**
 * 大对子（对对胡）：所有面子都是刻/杠（明或暗）+ 1 对将
 * 必须验证 concealed 部分能拆出 (4-meldCount-?) 个刻子 + 1 对将；同时 melds 全为 pung/kong
 */
function isAllPungs(concealed: CountArray, melds: MeldInfo[]): boolean {
  // melds 全部是 pung 或 kong（没有顺子，因为四川麻将不能吃）
  for (const m of melds) {
    if (m.type !== 'pung' && m.type !== 'kong') return false;
  }
  const meldCount = melds.length;
  // concealed 必须能 = (4-meldCount) 个刻子 + 1 对将
  // 简化：concealed 中每个非零的牌张数必须是 ∈ {0, 2, 3, 4}
  // 且恰好有一种 ∈ {2, 4} 的将候选；其余 ∈ {3, 4} 是刻
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (concealed[i] === 1) return false;
  }
  // 找将
  let pairFoundAt = -1;
  let pungCount = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    const v = concealed[i];
    if (v === 0) continue;
    if (v === 2 || v === 4) {
      // 4 既能算"刻 + 多 1 张"也不行；但若是大对子，4 在 concealed 里只能解释为"暗杠等同刻"
      // 标准做法：concealed 中的 4 张视为暗杠刻（值仍参与对对胡）
      if (v === 2 && pairFoundAt < 0) {
        pairFoundAt = i;
        continue;
      }
      // 4 张视为暗刻
      pungCount++;
      continue;
    }
    if (v === 3) {
      pungCount++;
      continue;
    }
    return false;
  }
  if (pairFoundAt < 0) return false;
  if (pungCount + meldCount !== 4) return false;
  return true;
}

function isQingyise(fullHand: CountArray): boolean {
  let used: Set<0 | 1 | 2> = new Set();
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (fullHand[i] > 0) used.add(suitOfIndex(i));
    if (used.size > 1) return false;
  }
  return used.size === 1;
}

function chitoitsuInfo(concealed: CountArray, meldCount: number): { isQiDui: boolean; isLongQiDui: boolean; quads: number } {
  if (meldCount !== 0) return { isQiDui: false, isLongQiDui: false, quads: 0 };
  let pairs = 0;
  let quads = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (concealed[i] === 2) pairs++;
    else if (concealed[i] === 4) {
      pairs += 2;
      quads++;
    } else if (concealed[i] !== 0) {
      return { isQiDui: false, isLongQiDui: false, quads: 0 };
    }
  }
  if (pairs !== 7) return { isQiDui: false, isLongQiDui: false, quads: 0 };
  return { isQiDui: true, isLongQiDui: quads >= 1, quads };
}

/**
 * 金钩钓：4 副明刻/杠 + 单吊对子
 * 基于结构：melds.length === 4 且全为 pung/kong；concealed 总数 === 2 且只有一对
 */
function isJinGouDiao(concealed: CountArray, melds: MeldInfo[]): boolean {
  if (melds.length !== 4) return false;
  for (const m of melds) {
    if (m.type !== 'pung' && m.type !== 'kong') return false;
  }
  let concealedTotal = 0;
  let pairCount = 0;
  let nonPair = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    concealedTotal += concealed[i];
    if (concealed[i] === 2) pairCount++;
    else if (concealed[i] !== 0) nonPair++;
  }
  return concealedTotal === 2 && pairCount === 1 && nonPair === 0;
}

/**
 * 根的统计：
 * - concealed 中 4 张相同（暗刻 4 张，未杠）→ 1 根
 * - 暗杠 / 明杠（melds 中的 kong）→ 1 根
 * - 注意：concealed 中已经被杠走的牌不再出现，所以不会双计
 */
function countGen(concealed: CountArray, melds: MeldInfo[]): number {
  let g = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (concealed[i] === 4) g++;
  }
  for (const m of melds) {
    if (m.type === 'kong') g++;
  }
  return g;
}

// =============== 综合计算 ===============

export function computeFan(ctx: FanContext): FanResult {
  const { concealed, melds, fullHand, isHaidi, winMethod, genMode, isAfterKong, isKongDischarge, isRobKong, isHeavenly, isEarthly } = ctx;
  const meldCount = melds.length;
  const fans: { name: string; value: number }[] = [];

  // 七对 / 龙七对
  let isQiDui = false;
  let isLong = false;
  if (meldCount === 0) {
    const info = chitoitsuInfo(concealed, meldCount);
    isQiDui = info.isQiDui;
    isLong = info.isLongQiDui;
  }

  // 大对子
  let isAllPung = false;
  if (!isQiDui) isAllPung = isAllPungs(concealed, melds);

  // 金钩钓（4 副明刻/杠 + 单吊对子）
  const jinGou = isJinGouDiao(concealed, melds);

  // 清一色（基于 fullHand 视图）
  const qingyise = isQingyise(fullHand);

  // 番种登记
  if (isLong) fans.push({ name: '龙七对', value: 3 });
  else if (isQiDui) fans.push({ name: '七对', value: 2 });
  if (isAllPung) fans.push({ name: '大对子', value: 1 });
  if (qingyise) fans.push({ name: '清一色', value: 2 });
  if (jinGou) fans.push({ name: '金钩钓', value: 2 });
  if (isHaidi) fans.push({ name: '海底捞月', value: 1 });
  if (winMethod === 'tsumo') fans.push({ name: '自摸', value: 1 });
  if (isAfterKong) fans.push({ name: '杠上花', value: 2 });
  if (isKongDischarge) fans.push({ name: '杠上炮', value: 1 });
  if (isRobKong) fans.push({ name: '抢杠胡', value: 1 });
  if (isHeavenly) fans.push({ name: '天胡', value: 6 });
  if (isEarthly) fans.push({ name: '地胡', value: 6 });

  // 根
  let genCount = countGen(concealed, melds);
  if (isLong) genCount = Math.max(0, genCount - 1);

  let extraDi = 0;
  if (genCount > 0) {
    if (genMode === 'fan') {
      fans.push({ name: `根 × ${genCount}`, value: genCount });
    } else {
      extraDi = genCount;
      fans.push({ name: `根 × ${genCount}（加底）`, value: 0 });
    }
  }

  const totalFan = fans.reduce((s, f) => s + f.value, 0);
  const desc = describeFan({ totalFan, extraDi, genMode, fans, genCount });

  return { fans, totalFan, extraDi, description: desc, genCount };
}

function describeFan({
  totalFan,
  extraDi,
  genMode,
  fans,
  genCount
}: {
  totalFan: number;
  extraDi: number;
  genMode: GenMode;
  fans: { name: string; value: number }[];
  genCount: number;
}): string {
  const parts: string[] = [];
  parts.push(`合计 ${totalFan} 番`);
  if (genMode === 'di' && genCount > 0) parts.push(`+ ${extraDi} 个加底`);
  return parts.join(' ');
}

export function settle(base: number, fan: FanResult, fanCap = 4): { perPlayer: number; detail: string } {
  const cappedFan = Math.min(fan.totalFan, fanCap);
  const mul = cappedFan <= 0 ? 1 : Math.pow(2, cappedFan - 1);
  const perPlayer = base * mul + base * fan.extraDi;
  const detail = `底分 ${base} × 2^(${cappedFan}-1) + 加底 ${fan.extraDi}×${base} = ${perPlayer}`;
  return { perPlayer, detail };
}

// =============== 兼容旧 API ===============
//
// 旧版 computeFan 接收 { hand, meldCount, kongTiles, ... }
// 新版要求 { concealed, melds, fullHand, ... }
// 这里保留一个 helper：从 concealed + melds 构建 fullHand

export function buildFullHand(concealed: CountArray, melds: MeldInfo[]): CountArray {
  const full = concealed.slice();
  for (const m of melds) {
    const idx = codeToIndex(m.tile);
    if (idx === null) continue;
    full[idx] += m.type === 'kong' ? 4 : 3;
  }
  return full;
}
