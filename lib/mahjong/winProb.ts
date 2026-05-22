/**
 * 多步前瞻 winProbability 计算
 *
 * 参考 pystyle 何切る期待値計算 / Tsumoron 的"speed reference"指标：
 *   1向听：约等于"接下来 10 巡内能完成胡牌的概率"
 *   2向听：约等于"接下来 3 巡内能进入听牌的概率"
 *
 * 我们使用一个轻量的递归 DP：
 *   - 给定当前 hand（13 张）和 shanten N
 *   - 模拟摸 → 打 → 摸 → 打 ... 最多 turnsLeft 巡
 *   - 每巡的进张概率 = 当前 ukeire 张数 / 剩余未见牌
 *   - 进张后 shanten 下降 1，递归
 *
 * 限制：
 *   - 仅支持 1向听 / 2向听（更深的 shanten 用启发式）
 *   - 缓存结果（相同 shanten + ukeire 比值 → 相同概率）
 *   - 避免精确枚举所有 hand 状态（代价指数级），用统计近似
 */

const TURNS_LEFT_DEFAULT = 12; // 平均剩余摸牌轮数（用户未提供 wallLeft 时的默认值）
const PROB_DRAW_USEFUL_FACTOR = 1.0; // 摸到有用牌的折扣（实际场上别人也会拿牌）

/**
 * 由"牌墙剩余张数"推算自己还能摸几巡
 *
 * 川麻血战到底 4 家轮摸：每巡自己只摸 1 张，所以 turnsLeft ≈ floor(wallLeft / 4)
 * - wallLeft 是牌墙未摸出的总张数，不是 totalUnseen（后者还包含他家手牌）
 * - 当 wallLeft 未提供时回退到默认 12 巡
 */
export function turnsLeftFromWall(wallLeft?: number): number {
  if (wallLeft === undefined || !isFinite(wallLeft) || wallLeft < 0) {
    return TURNS_LEFT_DEFAULT;
  }
  return Math.max(0, Math.floor(wallLeft / 4));
}

/**
 * 给定当前 shanten 与 ukeire 张数 / 未见牌总数 → 估算最终胡牌概率
 *
 * @param shanten 当前向听数（0..N）
 * @param ukeireCount 当前 ukeire 张数（推进 shanten 的牌的总剩余张数）
 * @param totalUnseen 当前剩余未见牌总数
 * @param turnsLeft 剩余摸牌轮数（默认 12）
 *
 * 算法：
 *   1向听 + 听张 K 张 / 未见 N 张：
 *     P(下一步进听) = K/N
 *     听牌后的 ukeire 平均按 (8 张) 估，胡牌概率 ≈ 8/N
 *     最终：1 - (1 - K/N × 8/N)^turnsLeft
 *
 *   2向听：
 *     相当于先进听 → 再胡。两层概率乘积，turnsLeft 在两层之间分配
 */
export function estimateMultiTurnWinProb(
  shanten: number,
  ukeireCount: number,
  totalUnseen: number,
  turnsLeft: number = TURNS_LEFT_DEFAULT
): number {
  if (shanten < 0) return 1; // 已胡
  if (totalUnseen <= 0 || ukeireCount <= 0) return 0;

  // 1 巡内摸到有用牌的概率（4 个玩家轮流摸，自己每巡只摸 1 张）
  const drawProb = Math.min(1, (ukeireCount / totalUnseen) * PROB_DRAW_USEFUL_FACTOR);

  if (shanten === 0) {
    // 已听：每巡有 drawProb 概率胡，turnsLeft 巡的累积
    return 1 - Math.pow(1 - drawProb, turnsLeft);
  }

  if (shanten === 1) {
    // 1 向听：先进听，再胡
    // 简化：把 turnsLeft 巡的"任意一巡进听 + 后续巡胡"积分
    // 经验值：进听后假设有 ≈ 6 张听张（中等口）
    const avgTenpaiUkeire = 6;
    const tenpaiHuProbPerTurn = avgTenpaiUkeire / Math.max(1, totalUnseen - 1);

    let totalProb = 0;
    for (let t = 1; t <= turnsLeft; t++) {
      // 第 t 巡首次进听：(1-drawProb)^(t-1) × drawProb
      const probReachTenpaiAtT = Math.pow(1 - drawProb, t - 1) * drawProb;
      // 进听后还剩 turnsLeft - t 巡来胡牌
      const remainTurns = turnsLeft - t;
      if (remainTurns <= 0) continue;
      const probHuFromTenpai = 1 - Math.pow(1 - tenpaiHuProbPerTurn, remainTurns);
      totalProb += probReachTenpaiAtT * probHuFromTenpai;
    }
    return Math.min(1, totalProb);
  }

  if (shanten === 2) {
    // 2 向听：先进 1 向听，再听，再胡
    // 经验值：1 向听平均 ukeire ≈ 18 张
    const avg1ShantenUkeire = 18;
    const reach1ShantenProbPerTurn = Math.min(1, avg1ShantenUkeire / Math.max(1, totalUnseen));

    let totalProb = 0;
    for (let t = 1; t <= turnsLeft; t++) {
      const probReach1ShantenAtT = Math.pow(1 - drawProb, t - 1) * drawProb;
      const remainTurns = turnsLeft - t;
      if (remainTurns <= 0) continue;
      // 递归：1 向听状态用 estimateMultiTurnWinProb(1, avgUkeireWhen1Shanten, ...)
      const huFrom1Shanten = estimateMultiTurnWinProb(
        1,
        avg1ShantenUkeire,
        totalUnseen - t,
        remainTurns
      );
      totalProb += probReach1ShantenAtT * huFrom1Shanten;
    }
    return Math.min(1, totalProb);
  }

  // 3+ 向听：粗略估计
  return Math.min(1, Math.pow(drawProb, shanten + 1) * 0.4);
}
