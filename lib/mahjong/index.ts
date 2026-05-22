/**
 * 顶层分析入口（重构版）
 *
 * 主要变化：
 * 1. 新增 objective: 'expectedScore' | 'speed'。expectedScore 是新默认推荐
 * 2. analyze() 返回结构包含 ok / error 字段，输入非法时返回 { ok: false, error }
 * 3. melds 参与缺一门判断；金钩钓基于结构识别
 * 4. shantenAfter === 0 时使用严格听牌枚举，不再出现"听牌但 effectiveTiles=空"
 * 5. 同时返回 EV 排序和速度排序两套结果（speedSuggestions 字段）
 */

import {
  CountArray,
  countsFromCodes,
  emptyCounts,
  totalTiles,
  indexToCode,
  codeToIndex
} from './tiles';
import {
  calcShanten,
  isWinningHand,
  isStandardWinningHand,
  isSevenPairsWinningHand,
  isLongChitoitsuWinningHand,
  enumerateWaitingTilesStrict,
  isMissingOneSuit,
  WaitingTile,
  ShantenResult,
  MeldDecl
} from './analyzer';
import {
  computeFan,
  buildFullHand,
  GenMode,
  FanResult,
  MeldInfo,
  settle
} from './scoring';
import {
  suggestDiscardsByEv,
  suggestDiscardsBySpeed,
  EvDiscardSuggestion
} from './ev';

export {
  isStandardWinningHand,
  isSevenPairsWinningHand,
  isLongChitoitsuWinningHand,
  isWinningHand,
  enumerateWaitingTilesStrict,
  calcShanten
};
export type { ShantenResult, WaitingTile, MeldDecl } from './analyzer';
export type { GenMode, FanResult, MeldInfo } from './scoring';
export type { EvDiscardSuggestion } from './ev';

export type Phase = 'win' | 'tenpai' | 'noten';
export type Objective = 'expectedScore' | 'speed';

export interface AnalysisInput {
  handCodes: string[];
  visibleCodes?: string[];
  meldCount?: number;
  melds?: MeldDecl[];
  isHaidi?: boolean;
  /** 杠上花：杠完后从牌墙补的牌直接胡 */
  isAfterKong?: boolean;
  /** 杠上炮：刚杠完后打出的牌被别人胡 */
  isKongDischarge?: boolean;
  /** 抢杠胡：别人补杠的牌正是自己胡的牌 */
  isRobKong?: boolean;
  /** 天胡：庄家发完牌（含自己摸的第 14 张）后直接胡，仅庄家可成立，+6 番 */
  isHeavenly?: boolean;
  /** 地胡：闲家第一摸即胡（其间庄家与上家未碰未杠），+6 番 */
  isEarthly?: boolean;
  /** 牌墙剩余张数（用于 winProb 推算自己还能摸几巡：turnsLeft = floor(wallLeft/4)） */
  wallLeft?: number;
  genMode?: GenMode;
  baseScore?: number;
  fanCap?: number;
  /** 出牌建议优化目标：默认 expectedScore（综合 EV） */
  objective?: Objective;
}

export interface AnalysisResultPayload {
  ok: true;
  phase: Phase;
  shanten: ShantenResult;
  isWin: boolean;
  waitingTiles?: (WaitingTile & { remaining: number; fan?: number })[];
  /** 主推荐（按 objective 决定排序） */
  suggestedDiscards?: EvDiscardSuggestion[];
  /** 备选：另一种排序结果（speed 模式作为参考） */
  speedSuggestions?: EvDiscardSuggestion[];
  evSuggestions?: EvDiscardSuggestion[];
  objective: Objective;
  warnings: string[];
  handSummary: string;
  remainingPoolHint?: { code: string; remaining: number }[];
  fan?: FanResult;
  settlement?: { perPlayer: number; detail: string };
}

export interface AnalysisErrorPayload {
  ok: false;
  error: string;
  warnings?: string[];
}

export type WinAnalysis = AnalysisResultPayload | AnalysisErrorPayload;

// ============== 输入校验 ==============

const VALID_TILE = /^[1-9][msp]$/;

function validateInput(input: AnalysisInput): string | null {
  if (!Array.isArray(input.handCodes)) return '非法手牌：handCodes 必须是数组';
  // 1. 校验每张牌的格式
  for (const c of input.handCodes) {
    if (typeof c !== 'string' || !VALID_TILE.test(c)) {
      return `非法手牌：${c} 不是合法的牌码（应为 1m..9p）`;
    }
  }
  if (input.handCodes.length > 14) {
    return `非法手牌：手牌不能超过 14 张（实际 ${input.handCodes.length} 张）`;
  }
  // 2. 校验每种牌不能超过 4 张
  const counts: Record<string, number> = {};
  for (const c of input.handCodes) counts[c] = (counts[c] ?? 0) + 1;
  for (const [code, n] of Object.entries(counts)) {
    if (n > 4) return `非法手牌：${code} 超过4张（实际 ${n} 张）`;
  }
  // 3. melds 校验
  if (input.melds !== undefined) {
    if (!Array.isArray(input.melds)) return '非法 melds：必须是数组';
    if (input.melds.length > 4) return '非法 melds：最多 4 副';
    for (const m of input.melds) {
      if (!m || typeof m !== 'object') return '非法 melds：元素格式错误';
      if (m.type !== 'pung' && m.type !== 'kong') return `非法 melds：type 必须是 pung 或 kong（实际 ${m.type}）`;
      if (typeof m.tile !== 'string' || !VALID_TILE.test(m.tile)) {
        return `非法 melds：tile ${m.tile} 不是合法牌码`;
      }
    }
  }
  // 4. melds + hand 中每种牌总数校验
  const totalCounts: Record<string, number> = { ...counts };
  for (const m of input.melds ?? []) {
    totalCounts[m.tile] = (totalCounts[m.tile] ?? 0) + (m.type === 'kong' ? 4 : 3);
    if (totalCounts[m.tile] > 4) return `非法手牌：${m.tile} 加上 melds 后超过4张`;
  }
  // 5. baseScore / fanCap 校验
  if (input.baseScore !== undefined) {
    if (typeof input.baseScore !== 'number' || !isFinite(input.baseScore) || input.baseScore <= 0) {
      return `非法 baseScore：必须是正数（实际 ${input.baseScore}）`;
    }
  }
  if (input.fanCap !== undefined) {
    if (typeof input.fanCap !== 'number' || !isFinite(input.fanCap) || input.fanCap < 0 || !Number.isInteger(input.fanCap)) {
      return `非法 fanCap：必须是非负整数（实际 ${input.fanCap}）`;
    }
  }
  // 6. 总张数校验：hand + melds*3 = 13 或 14
  const meldUnits = (input.melds ?? []).length;
  const total = input.handCodes.length + meldUnits * 3;
  if (input.handCodes.length > 0 && total !== 13 && total !== 14 && total > 0) {
    // 允许部分输入（用户还在拼牌），仅警告而不拒绝；交给上层处理
    // 此处不返回错误
  }
  return null;
}

export function analyze(input: AnalysisInput): WinAnalysis {
  // ===== 输入校验 =====
  const err = validateInput(input);
  if (err) {
    return { ok: false, error: err };
  }

  const warnings: string[] = [];
  const hand = countsFromCodes(input.handCodes);
  const visible = countsFromCodes(input.visibleCodes ?? []);
  const melds: MeldDecl[] = input.melds ?? [];
  const meldCount = melds.length > 0 ? melds.length : (input.meldCount ?? 0);
  const meldInfos: MeldInfo[] = melds.map(m => ({ type: m.type, tile: m.tile }));
  const genMode = input.genMode ?? 'fan';
  const baseScore = input.baseScore ?? 1;
  const fanCap = input.fanCap ?? 4;
  const isHaidi = input.isHaidi ?? false;
  const isAfterKong = input.isAfterKong ?? false;
  const isKongDischarge = input.isKongDischarge ?? false;
  const isRobKong = input.isRobKong ?? false;
  const isHeavenly = input.isHeavenly ?? false;
  const isEarthly = input.isEarthly ?? false;
  const wallLeft = input.wallLeft;
  const objective: Objective = input.objective ?? 'expectedScore';

  // 已碰/杠的牌从牌池扣除
  const meldTiles = emptyCounts();
  for (const m of melds) {
    const idx = codeToIndex(m.tile);
    if (idx === null || idx < 0 || idx >= 27) continue;
    meldTiles[idx] += m.type === 'kong' ? 4 : 3;
  }

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

  // 缺一门：必须包含 melds
  if (!isMissingOneSuit(hand, melds)) {
    warnings.push('手牌（含明牌）涉及三门花色，四川麻将要求胡牌时缺一门，需要打掉其中一门');
  }

  // 暗杠提示：concealed 中有 4 张相同 → 强烈建议先暗杠（不影响向听，且 +1 根加番）
  const concealedKongCandidates: string[] = [];
  for (let i = 0; i < hand.length; i++) {
    if (hand[i] === 4) concealedKongCandidates.push(indexToCode(i));
  }
  if (concealedKongCandidates.length > 0) {
    warnings.push(
      `检测到 ${concealedKongCandidates.length} 组 4 张相同（${concealedKongCandidates.join('、')}），建议优先暗杠：暗杠后向听数不变、加 1 根，且 4 张占位变为面子腾出空间，几乎必然提升 EV。`
    );
  }

  const handSummary = handCodesToHumanReadable(input.handCodes);

  const visibleAll = visible.slice();
  for (let i = 0; i < visibleAll.length; i++) visibleAll[i] += meldTiles[i];
  const remainingPool = defaultRemainingPool(hand, visibleAll);
  const totalUnseen = remainingPool.reduce((a, b) => a + b, 0);

  // ===== 直接判定胡牌 =====
  if (handTotal === expectedDrawn && isWinningHand(hand, meldCount, melds)) {
    const fan = computeFan({
      concealed: hand,
      melds: meldInfos,
      fullHand,
      winMethod: 'discard',
      isHaidi,
      isAfterKong,
      isKongDischarge,
      isRobKong,
      isHeavenly,
      isEarthly,
      genMode
    });
    const settlement = settle(baseScore, fan, fanCap);
    return {
      ok: true,
      phase: 'win',
      shanten: { shanten: -1, type: 'standard' },
      isWin: true,
      warnings,
      handSummary,
      objective,
      remainingPoolHint: topPoolHints(remainingPool),
      fan,
      settlement
    };
  }

  // ===== 听牌枚举（13 张时） =====
  if (handTotal === expectedTenpai) {
    const realWaits = enumerateWaitingTilesStrict(hand, melds);
    if (realWaits.length > 0) {
      const waits = realWaits.map(w => {
        const winFull = fullHand.slice();
        winFull[w.index]++;
        const winConcealed = hand.slice();
        winConcealed[w.index]++;
        const fan = computeFan({
          concealed: winConcealed,
          melds: meldInfos,
          fullHand: winFull,
          winningTile: w.code,
          winMethod: 'discard',
          isHaidi,
          isAfterKong,
          isKongDischarge,
          isRobKong,
          isHeavenly,
          isEarthly,
          genMode
        });
        return {
          ...w,
          remaining: remainingPool[w.index],
          fan: fan.totalFan
        };
      });
      return {
        ok: true,
        phase: 'tenpai',
        shanten: { shanten: 0, type: realWaits.some(w => w.winType !== 'standard') ? 'chitoitsu' : 'standard' },
        isWin: false,
        waitingTiles: waits,
        warnings,
        handSummary,
        objective,
        remainingPoolHint: topPoolHints(remainingPool)
      };
    }
  }

  // ===== 14 张待出（已摸） =====
  if (handTotal === expectedDrawn) {
    const evList = suggestDiscardsByEv(hand, {
      hand,
      remainingPool,
      totalUnseen,
      melds,
      genMode,
      fanCap,
      baseScore,
      wallLeft
    });
    const speedList = suggestDiscardsBySpeed(hand, {
      hand,
      remainingPool,
      totalUnseen,
      melds,
      genMode,
      fanCap,
      baseScore,
      wallLeft
    });

    // 给速度模式的 top1 加上"拆根/降番"提示（如果适用）
    annotateSpeedRationale(speedList, evList);

    const sh = calcShanten(hand, meldCount, melds);
    // 完整列表给上层（API/UI 自行 slice），方便测试和"列出所有候选"
    const main = objective === 'expectedScore' ? evList : speedList;

    return {
      ok: true,
      phase: sh.shanten === 0 ? 'tenpai' : 'noten',
      shanten: sh,
      isWin: false,
      suggestedDiscards: main,
      evSuggestions: evList,
      speedSuggestions: speedList,
      objective,
      warnings,
      handSummary,
      remainingPoolHint: topPoolHints(remainingPool)
    };
  }

  // ===== 其他张数：未听，给整体进张提示 =====
  const sh = calcShanten(hand, meldCount, melds);
  return {
    ok: true,
    phase: 'noten',
    shanten: sh,
    isWin: false,
    suggestedDiscards: [],
    objective,
    warnings: [...warnings, '当前牌数不属于"听牌/待出"标准状态，建议补齐手牌后再分析'],
    handSummary,
    remainingPoolHint: topPoolHints(remainingPool)
  };
}

function annotateSpeedRationale(
  speedList: EvDiscardSuggestion[],
  evList: EvDiscardSuggestion[]
): void {
  if (speedList.length === 0 || evList.length === 0) return;
  const speedTop = speedList[0];
  const evTop = evList[0];

  // 如果速度推荐和 EV 推荐不同：在速度推荐里追加"拆根/降番、EV 较低"提示
  if (speedTop.discardCode !== evTop.discardCode) {
    if (speedTop.lostGen > 0 && !speedTop.reasons.some(r => r.includes('拆根'))) {
      speedTop.reasons.push(`拆根 ×${speedTop.lostGen}：虽然进张多，但牺牲了根（番数上限下降）`);
    }
    if (speedTop.expectedScore < evTop.expectedScore) {
      speedTop.reasons.push(`EV 较低：综合期望收益不如打 ${evTop.discardCode}（降番代价大于下叫速度）`);
    }
  }
}

function defaultRemainingPool(hand: CountArray, visibleDiscards: CountArray): CountArray {
  return new Array(27).fill(0).map((_, i) => {
    const used = hand[i] + (visibleDiscards[i] || 0);
    return Math.max(0, 4 - used);
  });
}

function handCodesToHumanReadable(codes: string[]): string {
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
