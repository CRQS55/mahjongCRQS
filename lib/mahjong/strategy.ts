/**
 * 川麻开局 / 中盘助手：定缺 / 换三张 / 碰决策（增强版）
 *
 * - dingque(hand)：评估缺哪一门最好，综合考虑：
 *     1. 该门必丢张数
 *     2. 该门内的结构损失（完整面子>对子>搭子）
 *     3. 剩两门向听数 + ukeire（进张数）
 *     4. 剩两门暗刻数 / 清一色潜力 / 七对潜力
 *
 * - swap3(hand)：评估换哪 3 张同色，综合考虑：
 *     1. 换出后剩余手牌向听
 *     2. 是拆"孤张"还是"对子/搭子/面子"（沉没成本分级）
 *     3. 是否倾向边张/幺九
 *
 * - shouldPong(hand, target)：碰决策（保持原逻辑）
 */

import { CountArray, emptyCounts, indexToCode, codeToIndex, suitOfIndex } from './tiles';
import { calcShanten, isWinningHand, MeldDecl } from './analyzer';
import { suggestDiscardsByEv } from './ev';

const SUIT_LABEL: Record<'m' | 's' | 'p', string> = { m: '万', s: '条', p: '筒' };
const SUIT_ARR = ['m', 's', 'p'] as const;

// =============== 定缺建议（增强版） ===============

export interface DingqueSuggestion {
  suggestedDrop: 'm' | 's' | 'p';
  options: {
    suit: 'm' | 's' | 'p';
    suitName: string;
    /** 必丢张数 */
    tilesInSuit: number;
    /** 该门内的"已成结构"代价（顺子/刻子/对子/搭子） */
    structureLoss: number;
    /** 删掉该门后剩两门向听 */
    shantenAfter: number;
    /** 删掉该门后剩两门 ukeire 张数（推进 shanten 的牌的剩余总数） */
    ukeireAfter: number;
    /** 剩两门保留的暗刻数（每个 +1 根） */
    tripletsRest: number;
    /** 剩两门保留的对子数 */
    pairsRest: number;
    /** 是否强清一色潜力（剩两门张数 ≥ 12） */
    qingyisePotential: boolean;
    /** 综合代价（越低越好） */
    cost: number;
    /** 详细分项（debug） */
    breakdown: { item: string; value: number }[];
  }[];
  reasons: string[];
}

/**
 * 计算单门 9 个 rank 中的"已成结构"代价：
 *   完整刻子 +1.5（沉没 3 张已成面子）
 *   完整顺子 +1.5
 *   对子 +0.5（半成品）
 *   两面/嵌张/边张搭子 +0.3
 *   相邻空挡（kanchan，如 79、13、24 这类隔一个的两张孤立牌）+0.2
 *     —— 这是"潜在嵌张搭子"的兜底识别：如果在 structureLossInSuit 的贪心拆解里没被前面更高优先级的结构吃掉，
 *        说明它是真正落单的"隔张"，丢掉相当于多走一步进张
 */
function structureLossInSuit(suitCounts: number[]): number {
  // 用贪心拆解：刻子优先 → 顺子 → 对子 → 搭子
  const c = suitCounts.slice();
  let loss = 0;

  // 1. 刻子
  for (let i = 0; i < 9; i++) {
    while (c[i] >= 3) {
      c[i] -= 3;
      loss += 1.5;
    }
  }
  // 2. 顺子
  for (let i = 0; i <= 6; i++) {
    while (c[i] >= 1 && c[i + 1] >= 1 && c[i + 2] >= 1) {
      c[i]--; c[i + 1]--; c[i + 2]--;
      loss += 1.5;
    }
  }
  // 3. 对子
  for (let i = 0; i < 9; i++) {
    while (c[i] >= 2) {
      c[i] -= 2;
      loss += 0.5;
    }
  }
  // 4. 两面 / 嵌张搭子（相邻 + 隔一个，已用完前 3 类后剩下的）
  for (let i = 0; i <= 7; i++) {
    while (c[i] >= 1 && c[i + 1] >= 1) {
      c[i]--; c[i + 1]--;
      loss += 0.3;
    }
  }
  for (let i = 0; i <= 6; i++) {
    while (c[i] >= 1 && c[i + 2] >= 1) {
      c[i]--; c[i + 2]--;
      loss += 0.3;
    }
  }
  // 5. 相邻空挡（kanchan-with-gap，如 79、13、46 等剩下的"隔一格"双张）
  // 上一步 i+2 搭子贪心已经吃掉常规嵌张，这里只补"特别松"的隔张：
  //   - 79、13 这类带边幺九的隔张（实际只能等 8/2，仍是潜在面子）
  //   - 14、47、69 这类"差两个 rank"的两张（不算搭子，但离面子近）
  for (let i = 0; i <= 5; i++) {
    while (c[i] >= 1 && c[i + 3] >= 1) {
      c[i]--; c[i + 3]--;
      loss += 0.2;
    }
  }
  return loss;
}

/**
 * 计算 ukeire：在 13 张状态下（hand 必须是 13 张），枚举每张可摸的 tile，看 shanten 是否下降
 */
function calcUkeireCount(hand: CountArray): number {
  const baseSh = calcShanten(hand, 0).shanten;
  let total = 0;
  for (let t = 0; t < 27; t++) {
    if (hand[t] >= 4) continue;
    const trial = hand.slice();
    trial[t]++;
    const sh2 = calcShanten(trial, 0).shanten;
    if (sh2 < baseSh) {
      total += 4 - hand[t]; // 该种牌剩余张数
    }
  }
  return total;
}

export function suggestDingque(hand: CountArray): DingqueSuggestion {
  const options: DingqueSuggestion['options'] = [];

  for (let suit = 0 as 0 | 1 | 2; suit <= 2; suit = ((suit + 1) | 0) as 0 | 1 | 2) {
    const suitOffset = suit * 9;
    const adjusted = hand.slice();
    let tilesInSuit = 0;
    let triplets = 0;
    let pairs = 0;
    const thisSuitCounts: number[] = [];

    for (let r = 0; r < 9; r++) {
      thisSuitCounts.push(adjusted[suitOffset + r]);
      tilesInSuit += adjusted[suitOffset + r];
      if (adjusted[suitOffset + r] >= 3) triplets++;
      else if (adjusted[suitOffset + r] === 2) pairs++;
      adjusted[suitOffset + r] = 0;
    }

    const structureLoss = structureLossInSuit(thisSuitCounts);

    // 剩两门
    let totalRest = 0;
    let tripletsRest = 0;
    let pairsRest = 0;
    for (let i = 0; i < 27; i++) {
      totalRest += adjusted[i];
      if (adjusted[i] >= 3) tripletsRest++;
      else if (adjusted[i] === 2) pairsRest++;
    }

    const shAfter = calcShanten(adjusted, 0).shanten;

    // ukeire：需要把 adjusted 调整到 13 张才能算（如果当前不是 13 张就近似）
    // adjusted 张数 = totalRest = 总张数 - tilesInSuit；如果总张数是 13，删掉该门后是 13 - tilesInSuit
    // 这里直接基于 adjusted 算 ukeire，不考虑张数差异（只关心相对比较）
    const ukeireAfter = calcUkeireCount(adjusted);

    // 清一色潜力：剩两门张数 ≥ 12 时，剩两门近乎全色
    // 实际清一色需要单门 14 张，这里指"如果再删一门后近清一色"
    const restSuits: number[] = [];
    for (let s = 0; s < 3; s++) {
      if (s === suit) continue;
      let cnt = 0;
      for (let r = 0; r < 9; r++) cnt += adjusted[s * 9 + r];
      restSuits.push(cnt);
    }
    const maxRestSuit = Math.max(...restSuits);
    const qingyisePotential = maxRestSuit >= totalRest * 0.7 && totalRest >= 10;

    // ===== 综合代价 =====
    // 主项：必丢张数 + 剩两门向听
    // 损失项：该门结构损失 + 该门暗刻
    // 收益项：剩两门 ukeire / 剩两门暗刻 / 清一色潜力
    //
    // 校准（参考 xzdd-counter）：1 根 ≈ 1 番。在 cost 里的相对权重：
    //   必丢 1 张 ≈ 1.0
    //   剩两门 1 向听 ≈ 0.5
    //   1 个根（暗刻 4 张）≈ 1.0（与"1 番"对齐）
    //   清一色潜力 ≈ 2.0（清一色 2 番 + 摸进概率折扣）
    let cost = 0;
    const breakdown: { item: string; value: number }[] = [];

    cost += tilesInSuit;
    breakdown.push({ item: '必丢张数', value: tilesInSuit });

    cost += Math.max(0, shAfter) * 0.5;
    breakdown.push({ item: '剩两门向听×0.5', value: Math.max(0, shAfter) * 0.5 });

    cost += structureLoss;
    breakdown.push({ item: '该门结构损失', value: structureLoss });

    cost += triplets * 1.0;
    breakdown.push({ item: '该门暗刻×1.0（≈ 1 根）', value: triplets * 1.0 });

    cost -= ukeireAfter * 0.05;
    breakdown.push({ item: '剩两门 ukeire×-0.05', value: -ukeireAfter * 0.05 });

    cost -= tripletsRest * 0.8;
    breakdown.push({ item: '剩两门保留暗刻×-0.8', value: -tripletsRest * 0.8 });

    cost -= pairsRest * 0.2;
    breakdown.push({ item: '剩两门对子×-0.2', value: -pairsRest * 0.2 });

    if (qingyisePotential) {
      cost -= 2.0;
      breakdown.push({ item: '清一色潜力 -2.0', value: -2.0 });
    }

    options.push({
      suit: SUIT_ARR[suit],
      suitName: SUIT_LABEL[SUIT_ARR[suit]],
      tilesInSuit,
      structureLoss,
      shantenAfter: shAfter,
      ukeireAfter,
      tripletsRest,
      pairsRest,
      qingyisePotential,
      cost: parseFloat(cost.toFixed(2)),
      breakdown
    });
    if (suit === 2) break;
  }

  options.sort((a, b) => a.cost - b.cost);
  const best = options[0];

  const reasons: string[] = [];
  reasons.push(
    `建议缺 ${best.suitName}：必丢 ${best.tilesInSuit} 张（结构损失 ${best.structureLoss.toFixed(1)}），剩两门向听 ${best.shantenAfter}、ukeire ${best.ukeireAfter} 张`
  );
  if (best.tripletsRest > 0) {
    reasons.push(`剩两门保留 ${best.tripletsRest} 个暗刻（每个 +1 根）`);
  }
  if (best.qingyisePotential) {
    reasons.push('剩两门有强清一色潜力（+2 番）');
  }
  const second = options[1];
  if (second && second.cost - best.cost < 1.5) {
    reasons.push(`备选缺 ${second.suitName}（成本接近：${second.cost} vs ${best.cost}，可灵活选择）`);
  }
  if (best.tilesInSuit >= 5 && best.structureLoss < 1) {
    reasons.push('该门多为孤张/边张，丢掉无明显结构损失');
  }

  return {
    suggestedDrop: best.suit,
    options,
    reasons
  };
}

// =============== 换三张策略（增强版） ===============

export interface Swap3Suggestion {
  swapOut: { code: string; count: number }[];
  /** 换出后剩余手牌向听数 */
  expectedShantenAfter: number;
  /** 沉没等级：1=纯孤张（最好换），2=含搭子，3=含对子，4=拆完整面子 */
  sunkenTier: number;
  sunkenLabel: string;
  /** 边张/幺九分（越高越倾向丢） */
  edgeTileScore: number;
  reasons: string[];
}

/**
 * 判断 3 张牌的"沉没等级"：拆得越多结构越严重
 *   1 = 纯孤张（删后向听不变）
 *   2 = 含 1 个搭子（删后向听 +1，但不到 2）
 *   3 = 含对子（拆掉一对）
 *   4 = 拆完整面子（删后向听 +2 或更多）
 */
function classifySunken(
  hand: CountArray,
  threeIdx: number[],
  baseShanten: number
): { tier: number; label: string } {
  const trial = hand.slice();
  for (const i of threeIdx) trial[i]--;
  const shAfter = calcShanten(trial, 0).shanten;

  // 检查是否拆对子（之前 hand[i] = 2，现在 = 0 或 1）
  const counterBefore: Record<number, number> = {};
  for (const i of threeIdx) counterBefore[i] = (counterBefore[i] ?? 0) + 1;
  let hasPairBreak = false;
  for (const [idxStr, removed] of Object.entries(counterBefore)) {
    const idx = parseInt(idxStr);
    if (hand[idx] === 2 && removed >= 2) {
      hasPairBreak = true;
      break;
    }
  }

  const shantenJump = shAfter - baseShanten;

  if (shantenJump <= 0) {
    return { tier: 1, label: '纯孤张（无损失）' };
  }
  if (shantenJump === 1 && !hasPairBreak) {
    return { tier: 2, label: '拆 1 个搭子' };
  }
  if (hasPairBreak) {
    return { tier: 3, label: '拆对子' };
  }
  return { tier: 4, label: '拆完整面子（重大损失）' };
}

export function suggestSwap3(hand: CountArray): Swap3Suggestion[] {
  const baseSh = calcShanten(hand, 0).shanten;
  const candidates: {
    tiles: number[];
    remainingShanten: number;
    sunkenTier: number;
    sunkenLabel: string;
    edgeTileScore: number;
  }[] = [];

  for (let suit = 0; suit < 3; suit++) {
    const suitTiles: number[] = [];
    for (let r = 0; r < 9; r++) {
      const idx = suit * 9 + r;
      for (let k = 0; k < hand[idx]; k++) suitTiles.push(idx);
    }
    if (suitTiles.length < 3) continue;

    for (let i = 0; i < suitTiles.length; i++) {
      for (let j = i + 1; j < suitTiles.length; j++) {
        for (let k = j + 1; k < suitTiles.length; k++) {
          const trial = hand.slice();
          trial[suitTiles[i]]--;
          trial[suitTiles[j]]--;
          trial[suitTiles[k]]--;
          if (trial[suitTiles[i]] < 0 || trial[suitTiles[j]] < 0 || trial[suitTiles[k]] < 0) continue;
          const sh = calcShanten(trial, 0).shanten;
          const sunken = classifySunken(hand, [suitTiles[i], suitTiles[j], suitTiles[k]], baseSh);
          // 边张/幺九分：1/9 = 1, 2/8 = 0.5, 3/7 = 0.2, 4/5/6 = 0
          const tileScore = [suitTiles[i], suitTiles[j], suitTiles[k]].reduce((s, t) => {
            const r = t % 9;
            return s + (r === 0 || r === 8 ? 1 : r === 1 || r === 7 ? 0.5 : r === 2 || r === 6 ? 0.2 : 0);
          }, 0);
          candidates.push({
            tiles: [suitTiles[i], suitTiles[j], suitTiles[k]],
            remainingShanten: sh,
            sunkenTier: sunken.tier,
            sunkenLabel: sunken.label,
            edgeTileScore: tileScore
          });
        }
      }
    }
  }

  // 排序：沉没等级（拆得越少越好）→ 向听低 → 边张多
  candidates.sort((a, b) => {
    if (a.sunkenTier !== b.sunkenTier) return a.sunkenTier - b.sunkenTier;
    if (a.remainingShanten !== b.remainingShanten) return a.remainingShanten - b.remainingShanten;
    return b.edgeTileScore - a.edgeTileScore;
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
    const reasons: string[] = [];
    reasons.push(`沉没等级 ${c.sunkenTier}：${c.sunkenLabel}`);
    reasons.push(`换出后剩余 ${c.remainingShanten} 向听`);
    if (c.edgeTileScore >= 1.5) reasons.push('主要是边张/幺九，损失更小');
    else if (c.edgeTileScore >= 0.5) reasons.push('含部分边张');
    else reasons.push('全是中张，需谨慎');
    top.push({
      swapOut: Object.entries(tileCount).map(([code, count]) => ({ code, count })),
      expectedShantenAfter: c.remainingShanten,
      sunkenTier: c.sunkenTier,
      sunkenLabel: c.sunkenLabel,
      edgeTileScore: c.edgeTileScore,
      reasons
    });
    if (top.length >= 3) break;
  }
  return top;
}

// =============== 碰决策 ===============

export interface PongSuggestion {
  shouldPong: boolean;
  evWithoutPong: number;
  evWithPong: number;
  reasons: string[];
}

export function shouldPong(
  hand: CountArray,
  targetCode: string,
  melds: MeldDecl[],
  remainingPool: CountArray,
  totalUnseen: number,
  baseScore = 1,
  fanCap = 4,
  genMode: 'fan' | 'di' = 'fan',
  wallLeft?: number
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

  // ===== 不碰路径 =====
  // 别人打出的牌进自己手里 → 14 张状态，要打 1 张
  // 直接复用 suggestDiscardsByEv 算最优出牌的 EV
  // 注意：14 张里多出来的那张就是 target（视作"摸"了 target 进手）
  const handPlusTarget = hand.slice();
  handPlusTarget[targetIdx]++;
  let evWithoutPong = 0;
  let bestNoPongDiscard = '';
  let bestNoPongReason = '';
  if (handPlusTarget[targetIdx] <= 4) {
    const noPongList = suggestDiscardsByEv(handPlusTarget, {
      hand: handPlusTarget,
      remainingPool,
      totalUnseen,
      melds,
      genMode,
      fanCap,
      baseScore,
      wallLeft
    });
    if (noPongList.length > 0) {
      evWithoutPong = noPongList[0].expectedScore;
      bestNoPongDiscard = noPongList[0].discardCode;
      bestNoPongReason = noPongList[0].reasons[0] ?? '';
    } else {
      // 极端：手里没法再打 → 退回 shanten 估计
      const sh = calcShanten(hand, melds.length, melds);
      evWithoutPong = -sh.shanten * 0.5;
    }
  } else {
    // target 已经 4 张（理论上应该已暗杠），用 shanten 兜底
    const sh = calcShanten(hand, melds.length, melds);
    evWithoutPong = -sh.shanten * 0.5;
  }

  // ===== 碰路径 =====
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
    baseScore,
    wallLeft
  });

  const evWithPong = evList.length > 0 ? evList[0].expectedScore : 0;

  const reasons: string[] = [];
  if (bestNoPongDiscard) {
    reasons.push(`不碰：直接打 ${bestNoPongDiscard}（${bestNoPongReason}），EV ${evWithoutPong.toFixed(2)}`);
  }
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
