/**
 * 四川麻将番种与分数结算
 *
 * 用户给定的番种：
 *  - 大对子（对对胡）：4 刻 + 1 将        1 番
 *  - 清一色：胡牌牌只含一门花色          2 番
 *  - 七对：7 个对子                      2 番
 *  - 龙七对：含至少 1 组 4 张相同的七对    3 番（覆盖七对）
 *  - 金钩钓：所有面子已碰/杠（meld=4），独钓将 2 番
 *  - 海底捞月：最后一张牌胡（用户勾选）    1 番
 *  - 根：每出现 4 张相同（非龙七对那一根）  按"加番/加底"两种模式之一计入
 *      · 加番模式：每根 +1 番
 *      · 加底模式：番数不变，结算时多加 1 个底
 *
 * 备注：自摸不在用户给的列表里，这里仅作可选附加（默认不加），方便后续扩展。
 */

import { CountArray, TILE_KIND_COUNT, suitOfIndex, indexToCode } from './tiles';

export type GenMode = 'fan' | 'di'; // 根的结算模式：加番 / 加底

export interface FanContext {
  hand: CountArray; // 胡牌后的全部手牌（含刚胡的那张），共 14 张或 14-3*meld
  meldCount: number; // 已碰/杠面子数
  kongTiles?: CountArray; // 暗杠+明杠的具体牌（用于"根"判断），可选
  isHaidi?: boolean; // 海底捞月
  isTsumo?: boolean; // 自摸（保留接口）
  genMode: GenMode;
}

export interface FanResult {
  fans: { name: string; value: number }[]; // 番种与该番种的"番数"或"加底数"
  totalFan: number; // 总番数
  extraDi: number; // 加底数（加底模式下的根）
  description: string;
}

// =============== 番种判定 ===============

function isAllPungs(hand: CountArray, meldCount: number): boolean {
  // 14 张 = 4 面子 + 将；含 meld 时手牌减 3*meld
  // 用最简单的判定：所有未碰/杠的面子都必须是刻子（即手牌内不能有顺子分解使得有顺子被采用）
  // 直接检查：移除某个对子作将，剩余每张能否全部 3 张一组
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] >= 2) {
      const c = hand.slice();
      c[i] -= 2;
      let ok = true;
      for (let j = 0; j < TILE_KIND_COUNT; j++) {
        if (c[j] !== 0 && c[j] !== 3 && c[j] !== 4) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      // 4 张相同的处理：若刚好凑刻子+1张多余，不行；这里要求 c[j] ∈ {0,3}
      // 但 c[j] = 4 在加上 kong 的 meld 时存在；普通胡牌后手中如果 c[j] = 4，则不可能纯刻
      let ok2 = true;
      for (let j = 0; j < TILE_KIND_COUNT; j++) {
        if (c[j] !== 0 && c[j] !== 3) {
          ok2 = false;
          break;
        }
      }
      if (ok2) return true;
    }
  }
  return false;
}

function isQingyise(hand: CountArray): boolean {
  let used: Set<0 | 1 | 2> = new Set();
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] > 0) used.add(suitOfIndex(i));
    if (used.size > 1) return false;
  }
  return used.size === 1;
}

function chitoitsuInfo(hand: CountArray): { isQiDui: boolean; isLongQiDui: boolean; quads: number } {
  // 14 张全在手中且 meld=0 时才有意义
  let pairs = 0;
  let quads = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] === 2) pairs++;
    else if (hand[i] === 4) {
      pairs += 2;
      quads++;
    } else if (hand[i] !== 0) {
      return { isQiDui: false, isLongQiDui: false, quads: 0 };
    }
  }
  if (pairs !== 7) return { isQiDui: false, isLongQiDui: false, quads: 0 };
  return { isQiDui: true, isLongQiDui: quads >= 1, quads };
}

function isJinGouDiao(hand: CountArray, meldCount: number): boolean {
  // 金钩钓：所有面子靠碰/杠完成（meldCount === 4），手牌只剩 2 张（独钓将）
  if (meldCount !== 4) return false;
  let handCount = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) handCount += hand[i];
  return handCount === 2;
}

// 根的张数：手牌内每个出现 4 张相同 + 杠的张数
function countGen(hand: CountArray, kongTiles?: CountArray): number {
  let g = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] === 4) g++;
  }
  if (kongTiles) {
    for (let i = 0; i < TILE_KIND_COUNT; i++) {
      if (kongTiles[i] >= 4) g++;
      // 若杠的牌在手中又凑成 4 张，理论上不可能（已被杠走），所以不重复计
    }
  }
  return g;
}

// =============== 综合计算 ===============

export function computeFan(ctx: FanContext): FanResult {
  const { hand, meldCount, kongTiles, isHaidi, isTsumo, genMode } = ctx;
  const fans: { name: string; value: number }[] = [];

  // 七对 / 龙七对（仅 meld=0 时有意义）
  let isQiDui = false;
  let isLong = false;
  let qiDuiQuads = 0;
  if (meldCount === 0) {
    const info = chitoitsuInfo(hand);
    isQiDui = info.isQiDui;
    isLong = info.isLongQiDui;
    qiDuiQuads = info.quads;
  }

  // 大对子
  let isAllPung = false;
  if (!isQiDui) isAllPung = isAllPungs(hand, meldCount);

  // 金钩钓（要求大对子前提之一是 meld=4）
  const jinGou = isJinGouDiao(hand, meldCount);

  // 清一色
  const qingyise = isQingyise(hand);

  // 番种登记（不加根）
  if (isLong) fans.push({ name: '龙七对', value: 3 });
  else if (isQiDui) fans.push({ name: '七对', value: 2 });
  if (isAllPung) fans.push({ name: '大对子', value: 1 });
  if (qingyise) fans.push({ name: '清一色', value: 2 });
  if (jinGou) fans.push({ name: '金钩钓', value: 2 });
  if (isHaidi) fans.push({ name: '海底捞月', value: 1 });
  if (isTsumo) fans.push({ name: '自摸', value: 1 });

  // 根：每个 4 张相同记 1 根
  // 龙七对中那个/那些 4 张已经体现在"龙七对"番种里，按四川一般规则：龙七对里多出来的 4 张不再额外算根
  // 这里的策略：若是龙七对，则减去 1 个根（最少的），其他四张仍算根
  let genCount = countGen(hand, kongTiles);
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

  return { fans, totalFan, extraDi, description: desc };
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
  // 标准结算：番数 → 番倍（每番翻倍），含底分；玩家可在 UI 设置底分
  // 这里只描述结构
  const parts: string[] = [];
  parts.push(`合计 ${totalFan} 番`);
  if (genMode === 'di' && genCount > 0) parts.push(`+ ${extraDi} 个加底`);
  return parts.join(' ');
}

// 简单结算：base * 2^totalFan + (extraDi * base when 加底)
// 多数四川玩法：1 番 = 1×底，2 番 = 2×底，3 番 = 4×底（番翻倍），上限通常 4-5 番封顶
export function settle(base: number, fan: FanResult, fanCap = 4): { perPlayer: number; detail: string } {
  const cappedFan = Math.min(fan.totalFan, fanCap);
  // 番数 -> 倍数：1 番=1，2 番=2，3 番=4，4 番=8 ...（即 2^(n-1)，0 番=1）
  const mul = cappedFan <= 0 ? 1 : Math.pow(2, cappedFan - 1);
  const perPlayer = base * mul + base * fan.extraDi;
  const detail = `底分 ${base} × 2^(${cappedFan}-1) + 加底 ${fan.extraDi}×${base} = ${perPlayer}`;
  return { perPlayer, detail };
}
