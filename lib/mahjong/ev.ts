/**
 * EV（期望收益）出牌评分模型
 *
 * 综合评分：
 *   expectedScore =  胡牌概率 * 平均胡牌得分
 *                  + 查叫价值
 *                  + 高番结构保留奖励
 *                  - 拆根/拆高番结构惩罚
 *                  - 风险惩罚（占位，可扩展）
 *
 * 字段（每个 discard 候选）：
 *   discardCode, shantenAfter, effectiveTiles, effectiveCount
 *   expectedScore, winProbability, averageFan, maxFanPotential, fanDistribution
 *   lostGen, preservedGen
 *   sevenPairsPotential, longSevenPairsPotential, allPungsPotential, pureSuitPotential
 *   riskPenalty, reasons
 */

import {
  CountArray,
  TILE_KIND_COUNT,
  totalTiles,
  suitOfIndex,
  indexToCode,
  emptyCounts
} from './tiles';
import {
  calcShanten,
  isWinningHand,
  isStandardWinningHand,
  isSevenPairsWinningHand,
  isLongChitoitsuWinningHand,
  enumerateWaitingTilesStrict,
  MeldDecl
} from './analyzer';
import {
  computeFan,
  buildFullHand,
  GenMode,
  MeldInfo,
  FanResult
} from './scoring';
import { estimateMultiTurnWinProb } from './winProb';

const COPIES_PER_TILE_LIMIT = 4;

/**
 * 给定 14 张状态：枚举打掉哪张后能真实听牌
 * @param keepGen 若给定，则要求结果牌型至少保留 keepGen 个根（4 张相同的暗刻）
 *                这避免把"必须拆根才能听"的路径也算作有效进张
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

export type ActionType = 'discard' | 'concealedKong';

export interface EvDiscardSuggestion {
  discard: number;
  discardCode: string;
  /** 动作类型：discard=打牌，concealedKong=暗杠 */
  actionType?: ActionType;
  shantenAfter: number;
  effectiveTiles: { index: number; code: string; remaining: number }[];
  effectiveCount: number;
  probability?: number;

  // EV 字段
  expectedScore: number;
  /** 短期"速度分"：听牌奖励 + 听张/进张数 */
  speedScore: number;
  /** 长期"价值分"：番数潜力 + 结构保留 - 拆根/拆暗刻惩罚 */
  valueScore: number;
  winProbability: number;
  averageFan: number;
  maxFanPotential: number;
  fanDistribution: { fan: number; count: number }[];

  lostGen: number;
  preservedGen: number;
  lostTriplets: number;
  preservedTriplets: number;
  sevenPairsPotential: number;
  longSevenPairsPotential: number;
  allPungsPotential: number;
  pureSuitPotential: number;

  riskPenalty: number;
  reasons: string[];
}

export interface EvOptions {
  hand: CountArray;
  remainingPool: CountArray;
  totalUnseen: number; // 未见牌总数（用于概率分母）
  melds: MeldDecl[];
  genMode: GenMode;
  fanCap: number;
  baseScore: number;
}

/**
 * 当前手牌的"根"数（不包含 melds 中的杠，因为 discard 不会动 melds）
 */
function countConcealedGen(hand: CountArray): number {
  let g = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) if (hand[i] === 4) g++;
  return g;
}

/**
 * 估算"高番结构潜力"评分（0..1）
 * 仅作为启发式：根据当前结构与目标的距离给出 0..1
 */
function estimateStructurePotentials(
  after: CountArray,
  meldCount: number,
  melds: MeldDecl[]
) {
  const total = totalTiles(after);

  // 七对潜力：当前对子数 / 7（meld=0 时才有意义）
  let pairs = 0;
  let kinds = 0;
  let quads = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (after[i] >= 2) pairs++;
    if (after[i] >= 1) kinds++;
    if (after[i] === 4) quads++;
  }
  const sevenPairsPotential = meldCount === 0 ? Math.min(1, pairs / 7) : 0;
  const longSevenPairsPotential = meldCount === 0 ? Math.min(1, (pairs / 7) * (quads >= 1 ? 1 : 0.4)) : 0;

  // 大对子潜力：手牌中 ∈ {2,3,4} 的占比
  let pungLikeTiles = 0;
  let pungLikeKinds = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (after[i] >= 2) {
      pungLikeKinds++;
      pungLikeTiles += after[i];
    }
  }
  // 假设需要 4 个刻 + 1 对 = 5 组同点；明刻直接计入
  const targetGroups = 5;
  const allPungsPotential = Math.min(1, (pungLikeKinds + meldCount) / targetGroups);

  // 清一色潜力：手牌+明牌中最多那一门的占比
  const suitCounts = [0, 0, 0];
  for (let i = 0; i < TILE_KIND_COUNT; i++) suitCounts[suitOfIndex(i)] += after[i];
  for (const m of melds) {
    const ch = m.tile[1];
    const s = ch === 'm' ? 0 : ch === 's' ? 1 : 2;
    suitCounts[s] += m.type === 'kong' ? 4 : 3;
  }
  const totalAll = suitCounts[0] + suitCounts[1] + suitCounts[2];
  const maxSuit = Math.max(...suitCounts);
  const pureSuitPotential = totalAll > 0 ? maxSuit / totalAll : 0;

  return {
    sevenPairsPotential,
    longSevenPairsPotential,
    allPungsPotential,
    pureSuitPotential
  };
}

/**
 * 评估某一 discard 后的 EV
 *
 * 算法概要：
 * - 算 shanten + effectiveTiles
 * - 若 shanten==0：枚举每个真听张 → 模拟胡牌 → 算 fan → 加权（remaining/totalUnseen）
 * - 若 shanten>=1：用启发式估计（最大潜在 fan、最近一步进张多少能保留多少结构）
 * - 拆根惩罚：与 hand 比较 concealed 4 张数下降则记 lostGen
 */
export function evaluateDiscard(
  hand: CountArray,
  discardIdx: number,
  opts: EvOptions
): EvDiscardSuggestion {
  const { remainingPool, totalUnseen, melds, genMode, fanCap, baseScore } = opts;
  const meldCount = melds.length;

  const after = hand.slice();
  after[discardIdx]--;

  const sh = calcShanten(after, meldCount, melds);
  let shantenAfter = sh.shanten;

  // 有效进张：与 suggestDiscards 对齐
  let effectiveTiles: { index: number; code: string; remaining: number }[] = [];

  if (shantenAfter === 0) {
    const realWaits = enumerateWaitingTilesStrict(after, melds);
    effectiveTiles = realWaits.map(w => ({
      index: w.index,
      code: w.code,
      remaining: Math.max(0, remainingPool[w.index])
    }));
    // 关键修正：calcShanten 给出 0 但实际没有真听张时，需要把"effectiveTiles"
    // 改为"摸到任意一张能让真实听张数 > 0 的牌"，shantenAfter 提升为 1
    if (effectiveTiles.length === 0) {
      shantenAfter = 1;
      // 计算 after 状态的根数，要求路径不能再降低根数（否则等于"打 X + 拆根"两步代价）
      let baseGen = 0;
      for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 4) baseGen++;
      for (let t = 0; t < TILE_KIND_COUNT; t++) {
        if (after[t] >= COPIES_PER_TILE_LIMIT) continue;
        const drawn = after.slice();
        drawn[t]++;
        // 摸 t 后的根数（可能 +1，因为 t 可能凑成 4 张）
        let drawnGen = 0;
        for (let i = 0; i < TILE_KIND_COUNT; i++) if (drawn[i] === 4) drawnGen++;
        // 要求：能在保留至少 baseGen 个根的前提下打掉一张并真听
        if (canReachRealTenpaiByOneDiscard(drawn, melds, baseGen)) {
          effectiveTiles.push({
            index: t,
            code: indexToCode(t),
            remaining: Math.max(0, remainingPool[t])
          });
        }
      }
    }
  } else {
    // 当前 after 状态的根数（用于过滤"必须拆根才能下叫"的伪进张）
    let baseGen = 0;
    for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 4) baseGen++;

    for (let t = 0; t < TILE_KIND_COUNT; t++) {
      if (after[t] >= COPIES_PER_TILE_LIMIT) continue;
      const trial = after.slice();
      trial[t]++;
      const sh2 = calcShanten(trial, meldCount, melds);
      if (sh2.shanten < shantenAfter) {
        // 听牌相关进一步严格验证
        if (sh2.shanten === 0) {
          // 必须能在不拆根的前提下下叫（否则伪进张）
          const reachable = canReachRealTenpaiByOneDiscard(trial, melds, baseGen);
          if (!reachable) continue;
        }
        effectiveTiles.push({
          index: t,
          code: indexToCode(t),
          remaining: Math.max(0, remainingPool[t])
        });
      }
    }
  }

  const effectiveCount = effectiveTiles.reduce((a, b) => a + b.remaining, 0);

  // ===== 拆根判断 =====
  const beforeGen = countConcealedGen(hand);
  const afterGen = countConcealedGen(after);
  const lostGen = Math.max(0, beforeGen - afterGen);
  const preservedGen = afterGen;

  // ===== 暗刻潜力（3 张相同：可暗杠/根的潜在结构） =====
  // 当前手牌中（hand 14张）有几个 3 张相同
  let beforeTriplets = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) if (hand[i] >= 3) beforeTriplets++;
  // 打 discard 后 13 张的暗刻数（不含已是 4 张的暗刻）
  let afterTriplets = 0;
  for (let i = 0; i < TILE_KIND_COUNT; i++) if (after[i] === 3) afterTriplets++;
  // 拆暗刻惩罚（999 → 99，少了一个能成根/暗杠的潜力）
  const lostTriplets = Math.max(0, beforeTriplets - afterTriplets - lostGen);

  // ===== 番数估计 =====
  let winProbability = 0;
  let averageFan = 0;
  let maxFanPotential = 0;
  const fanMap = new Map<number, number>();

  const meldInfos: MeldInfo[] = melds.map(m => ({ type: m.type, tile: m.tile }));

  if (shantenAfter === 0 && effectiveTiles.length > 0) {
    // 听牌阶段：精确计算每个胡张的 fan
    let totalWeight = 0;
    let weightedFan = 0;
    for (const w of effectiveTiles) {
      const winConcealed = after.slice();
      winConcealed[w.index]++;
      const fullHand = buildFullHand(winConcealed, meldInfos);
      const fan = computeFan({
        concealed: winConcealed,
        melds: meldInfos,
        fullHand,
        winningTile: w.code,
        winMethod: 'discard',
        genMode
      });
      const cappedFan = Math.min(fan.totalFan, fanCap);
      totalWeight += w.remaining;
      weightedFan += w.remaining * cappedFan;
      maxFanPotential = Math.max(maxFanPotential, cappedFan);
      fanMap.set(cappedFan, (fanMap.get(cappedFan) ?? 0) + w.remaining);
    }
    winProbability = totalUnseen > 0 ? totalWeight / totalUnseen : 0;
    averageFan = totalWeight > 0 ? weightedFan / totalWeight : 0;
  } else {
    // 未听阶段：使用多步前瞻 DP 估算（参考 pystyle 期待値計算的递归思路）
    // 不再用粗糙的 stepProb^(shanten+1) × 0.6
    winProbability = estimateMultiTurnWinProb(shantenAfter, effectiveCount, totalUnseen);

    const pots = estimateStructurePotentials(after, meldCount, melds);
    let estMaxFan = 0;
    if (pots.longSevenPairsPotential > 0.85) estMaxFan = Math.max(estMaxFan, 3);
    else if (pots.sevenPairsPotential > 0.85) estMaxFan = Math.max(estMaxFan, 2);
    if (pots.allPungsPotential > 0.7) estMaxFan = Math.max(estMaxFan, 1);
    if (pots.pureSuitPotential > 0.95) estMaxFan = Math.max(estMaxFan, 2);
    estMaxFan += preservedGen;
    maxFanPotential = Math.min(estMaxFan, fanCap);
    averageFan = maxFanPotential * 0.5;
  }

  // ===== 高番结构潜力（输出字段） =====
  const pots = estimateStructurePotentials(after, meldCount, melds);

  // ===== 风险惩罚（暂占位，可扩展为放铳风险） =====
  const riskPenalty = 0;

  // ===== EV 综合计算（两轴拆分）=====
  //
  // 业内做法（pystyle 期待値計算 / riichi.wiki tile efficiency）：
  // - 速度（speed）：聴牌確率 × 和了確率，强调当前听张数与下叫概率
  // - 价值（value）：和了得点 × 番数潜力，强调番数 + 结构保留
  // 两者权衡：
  //   听牌阶段速度分应明显高于 1 向听
  //   双对子结构 / 暗刻保留 / 清一色潜力影响价值分，不该被听张数完全压过

  const fanMultiplier = Math.pow(2, Math.max(0, maxFanPotential));
  const winRewardEstimate = winProbability * baseScore * fanMultiplier;

  // ===== 速度分 =====
  // 听牌：base × 1.0 (固定下叫奖励) + winProb × 4 × base (听张多奖励)
  // 1向听：按比例给少量
  const tingValue =
    shantenAfter === 0
      ? baseScore * 1.0 + winProbability * baseScore * 4.0
      : shantenAfter === 1
        ? Math.min(0.4 * baseScore, (effectiveCount / Math.max(1, totalUnseen)) * baseScore * 0.8)
        : 0;
  const speedScore = winRewardEstimate + tingValue;

  // ===== 价值分 =====
  //
  // 校准依据（参考 xzdd-counter 等川麻计分项目）：
  //   1 根 ≈ 1 番 ≈ 大对子 / 海底捞月
  //   1 番 在结算上是"倍数翻倍"，但要乘以 winProbability 才是真实 EV 增量
  //   经验值：1 根的期望 EV 贡献 ≈ 0.3–0.4 × base
  //   暗刻（3 张相同）不是独立番种，仅"潜在升级为根"的概率 ≈ 1.5%，价值 ≈ 0.05 × base
  //
  // - 保留的根 / 暗刻：直接加分（每个根/暗刻在四川麻将都有显著番数贡献）
  // - 七对/龙七对/大对子/清一色潜力：在听牌阶段保留 30% 权重（仍可能升级），
  //   1 向听及以下保留 100% 权重
  const structureWeight = shantenAfter === 0 ? 0.3 : 1.0;
  const futureStructureBonus =
    structureWeight * (
      pots.longSevenPairsPotential * 0.5 * baseScore +
      pots.sevenPairsPotential * 0.25 * baseScore +
      pots.allPungsPotential * 0.3 * baseScore +
      pots.pureSuitPotential * 0.5 * baseScore
    );
  const structureBonus =
    preservedGen * 0.35 * baseScore +              // 1 根 ≈ 1 番期望增量 ≈ 0.35×base
    afterTriplets * 0.08 * baseScore +             // 暗刻仅有"升级为根"的小概率，价值很小
    futureStructureBonus;

  // 拆暗刻 / 拆根惩罚（与上述价值对应）
  const lostGenPenalty = lostGen * (0.5 * baseScore + 0.3);    // 拆 1 根代价 ≈ 0.8（base=1）
  const lostTripletPenalty = lostTriplets * (0.15 * baseScore); // 拆 999→99 代价 ≈ 0.15

  const valueScore = structureBonus - lostGenPenalty - lostTripletPenalty - riskPenalty;

  const expectedScore = speedScore + valueScore;

  // ===== 推荐理由 =====
  const reasons: string[] = [];
  if (shantenAfter === 0) {
    reasons.push(`听牌：${effectiveTiles.length} 种胡张，共 ${effectiveCount} 张`);
    if (averageFan >= 2) reasons.push(`平均 ${averageFan.toFixed(1)} 番（番数较优）`);
  } else if (shantenAfter === 1) {
    reasons.push(`一向听：${effectiveTiles.length} 种进张可下叫`);
  } else {
    reasons.push(`${shantenAfter} 向听：进张 ${effectiveTiles.length} 种`);
  }
  if (lostGen > 0) {
    reasons.push(`拆根 ×${lostGen}（损失 ${lostGen} 个 4 张相同的暗刻 → 番数上限下降）`);
  }
  if (lostTriplets > 0) {
    reasons.push(`拆暗刻 ×${lostTriplets}（损失 ${lostTriplets} 个 3 张相同 → 失去成根/暗杠潜力）`);
  }
  if (preservedGen > 0) {
    reasons.push(`保留 ${preservedGen} 个根`);
  }
  if (afterTriplets > 0) {
    reasons.push(`保留 ${afterTriplets} 个暗刻（潜在根/暗杠）`);
  }
  if (pots.longSevenPairsPotential > 0.7) reasons.push('龙七对潜力较高');
  else if (pots.sevenPairsPotential > 0.7) reasons.push('七对潜力较高');
  if (pots.allPungsPotential > 0.7 && shantenAfter <= 2) reasons.push('大对子潜力较高');
  if (pots.pureSuitPotential > 0.9) reasons.push('清一色潜力较高');
  if (lostGen > 0 && shantenAfter === 0) {
    reasons.push('降番：拆根虽快下叫，但牺牲整体收益');
  }

  return {
    discard: discardIdx,
    discardCode: indexToCode(discardIdx),
    actionType: 'discard',
    shantenAfter,
    effectiveTiles,
    effectiveCount,
    probability: totalUnseen > 0 ? effectiveCount / totalUnseen : 0,

    expectedScore,
    speedScore,
    valueScore,
    winProbability,
    averageFan,
    maxFanPotential,
    fanDistribution: Array.from(fanMap.entries()).map(([fan, count]) => ({ fan, count })).sort((a, b) => a.fan - b.fan),

    lostGen,
    preservedGen,
    lostTriplets,
    preservedTriplets: afterTriplets,
    sevenPairsPotential: pots.sevenPairsPotential,
    longSevenPairsPotential: pots.longSevenPairsPotential,
    allPungsPotential: pots.allPungsPotential,
    pureSuitPotential: pots.pureSuitPotential,

    riskPenalty,
    reasons
  };
}

/**
 * EV 模式：返回所有 discard 候选 + 暗杠候选，按 expectedScore 降序
 */
export function suggestDiscardsByEv(
  hand: CountArray,
  opts: EvOptions
): EvDiscardSuggestion[] {
  const out: EvDiscardSuggestion[] = [];
  for (let d = 0; d < TILE_KIND_COUNT; d++) {
    if (hand[d] === 0) continue;
    out.push(evaluateDiscard(hand, d, opts));
  }
  // 暗杠候选：手中 4 张相同 → 视为一个 action
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] === 4) {
      const kongAction = evaluateConcealedKong(hand, i, opts);
      if (kongAction) out.push(kongAction);
    }
  }
  out.sort((a, b) => b.expectedScore - a.expectedScore);
  return out;
}

/**
 * 速度模式：返回所有 discard 候选 + 暗杠候选，按 (shanten 升序, effectiveCount 降序)
 */
export function suggestDiscardsBySpeed(
  hand: CountArray,
  opts: EvOptions
): EvDiscardSuggestion[] {
  const out: EvDiscardSuggestion[] = [];
  for (let d = 0; d < TILE_KIND_COUNT; d++) {
    if (hand[d] === 0) continue;
    out.push(evaluateDiscard(hand, d, opts));
  }
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    if (hand[i] === 4) {
      const kongAction = evaluateConcealedKong(hand, i, opts);
      if (kongAction) out.push(kongAction);
    }
  }
  out.sort((a, b) => {
    if (a.shantenAfter !== b.shantenAfter) return a.shantenAfter - b.shantenAfter;
    return b.effectiveCount - a.effectiveCount;
  });
  return out;
}

/**
 * 暗杠候选评估：手中 4 张相同的牌，杠掉后变成 1 副明面子（kong），手牌从 14 张变 11 张
 *
 * 评估方法：
 * 1. 模拟"杠后再摸一张"的状态（杠后会从牌墙补一张）
 * 2. 因为补的牌不确定，取所有可能补牌的加权平均 EV
 * 3. 杠本身额外加 1 根的奖励，且番数上限提升
 */
function evaluateConcealedKong(
  hand: CountArray,
  kongIdx: number,
  opts: EvOptions
): EvDiscardSuggestion | null {
  if (hand[kongIdx] !== 4) return null;
  const { remainingPool, totalUnseen, melds, genMode, fanCap, baseScore } = opts;

  // 杠后的"裸"状态：手中去掉这 4 张，melds 加 1 副 kong
  const afterKong = hand.slice();
  afterKong[kongIdx] = 0;
  const newMelds: MeldDecl[] = [...melds, { type: 'kong', tile: indexToCode(kongIdx) }];

  // 现在手中是 10 张（原 14 - 4），需要再摸一张才到 11 张正常待出状态
  // 取所有可能补牌位置的加权 EV
  let bestEv = -Infinity;
  let bestSubResult: EvDiscardSuggestion | null = null;
  let weightedEv = 0;
  let totalWeight = 0;

  for (let drawT = 0; drawT < TILE_KIND_COUNT; drawT++) {
    if (afterKong[drawT] >= COPIES_PER_TILE_LIMIT) continue;
    const remaining = remainingPool[drawT];
    if (remaining === 0) continue;
    const drawn = afterKong.slice();
    drawn[drawT]++;
    // 在 drawn 状态下选最优出牌
    const subOpts: EvOptions = {
      hand: drawn,
      remainingPool,
      totalUnseen: Math.max(1, totalUnseen - 1),
      melds: newMelds,
      genMode,
      fanCap,
      baseScore
    };
    let bestSubEv = -Infinity;
    let bestSub: EvDiscardSuggestion | null = null;
    for (let d = 0; d < TILE_KIND_COUNT; d++) {
      if (drawn[d] === 0) continue;
      const cand = evaluateDiscard(drawn, d, subOpts);
      if (cand.expectedScore > bestSubEv) {
        bestSubEv = cand.expectedScore;
        bestSub = cand;
      }
    }
    if (bestSub) {
      weightedEv += remaining * bestSubEv;
      totalWeight += remaining;
      if (bestSubEv > bestEv) {
        bestEv = bestSubEv;
        bestSubResult = bestSub;
      }
    }
  }

  if (totalWeight === 0 || !bestSubResult) {
    // 极端情况：杠后没法摸（整副已胡牌堆见底）
    return null;
  }

  const expectedSubEv = weightedEv / totalWeight;
  // 暗杠本身的价值组成：
  //   1. +1 根 → ≈ 0.35 × base 的 EV 增量
  //      （这是暗杠独有的，sub-EV 里 preservedGen 不包含被杠走的这一组）
  //   2. 杠后能再摸一张牌（多一次进张机会）→ ≈ 0.4 × base
  //   3. 暗杠后这一组永久锁定，避免被对家碰走/打错
  // 之前用 0.6×base + 1（即 1.6）严重高估，校准后应在 0.7–0.9 区间
  const kongBonus = baseScore * 0.5 + 0.4;

  return {
    discard: kongIdx,
    discardCode: indexToCode(kongIdx),
    actionType: 'concealedKong',
    shantenAfter: bestSubResult.shantenAfter,
    effectiveTiles: bestSubResult.effectiveTiles,
    effectiveCount: bestSubResult.effectiveCount,
    probability: bestSubResult.probability,

    expectedScore: expectedSubEv + kongBonus,
    speedScore: bestSubResult.speedScore,
    valueScore: bestSubResult.valueScore + kongBonus,
    winProbability: bestSubResult.winProbability,
    averageFan: bestSubResult.averageFan,
    maxFanPotential: Math.min(fanCap, bestSubResult.maxFanPotential + 1),
    fanDistribution: bestSubResult.fanDistribution,

    lostGen: 0,
    preservedGen: bestSubResult.preservedGen + 1, // 杠后这一组永久成根
    lostTriplets: 0,
    preservedTriplets: bestSubResult.preservedTriplets,
    sevenPairsPotential: 0, // 杠后失去七对资格
    longSevenPairsPotential: 0,
    allPungsPotential: bestSubResult.allPungsPotential,
    pureSuitPotential: bestSubResult.pureSuitPotential,

    riskPenalty: 0,
    reasons: [
      `暗杠 ${indexToCode(kongIdx)}：4 张相同变为暗杠，+1 根、番数上限 +1`,
      `杠后预期最优出牌：${bestSubResult.discardCode}（${bestSubResult.reasons[0] ?? ''}）`,
      `杠后状态平均 EV ≈ ${expectedSubEv.toFixed(2)}`,
      '暗杠不影响向听数，且永久锁定 1 根，建议优先考虑'
    ]
  };
}
