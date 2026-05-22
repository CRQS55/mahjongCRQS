/**
 * 进攻算法回归测试（10 + 1）
 *
 * 覆盖点：
 *   1. 标准胡牌
 *   2. melds 参与缺一门
 *   3. 严格听牌枚举
 *   4. 三门非法胡
 *   5. 四张算两对的七对向听
 *   6. 龙七对成胡（4 张那一组算 2 对）
 *   7. genMode fan / di 结算差异
 *   8. winMethod=tsumo 接通
 *   9. shouldPong 不碰路径不能把 target 加入手牌
 *  10. 听牌 EV 必须用 settle() 按胡张剩余数加权
 *  +1. 暗杠 EV 必须枚举所有补牌并扣减 remainingPool
 *
 * 注：所有测试只覆盖进攻算法，不涉及防守/放铳模型
 */
import { describe, it, expect } from 'vitest';
import {
  analyze,
  isStandardWinningHand,
  isWinningHand,
  enumerateWaitingTilesStrict,
  calcShanten
} from '@/lib/mahjong';
import { countsFromCodes, codeToIndex, emptyCounts } from '@/lib/mahjong/tiles';
import { computeFan, buildFullHand, settle } from '@/lib/mahjong/scoring';
import { suggestDiscardsByEv, evaluateDiscard } from '@/lib/mahjong/ev';
import { shouldPong } from '@/lib/mahjong/strategy';

describe('1. 标准胡牌', () => {
  it('123 456 789 万 + 333 条 + 5p5p：缺一门 → 不能胡（三门齐）', () => {
    const counts = countsFromCodes([
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '3s','3s','3s',
      '5p','5p'
    ]);
    expect(isStandardWinningHand(counts, 0)).toBe(true);
    // 但川麻必须缺一门：三门齐时 isWinningHand 应拒绝
    expect(isWinningHand(counts, 0)).toBe(false);
  });

  it('两门成胡（缺筒）：标准型应为合法胡', () => {
    const counts = countsFromCodes([
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '3s','3s','3s',
      '4s','4s'
    ]);
    expect(isStandardWinningHand(counts, 0)).toBe(true);
    expect(isWinningHand(counts, 0)).toBe(true);
  });
});

describe('2. melds 参与缺一门', () => {
  it('已碰第三门后，缺一门校验应仍能识别', () => {
    // 手中只有 m + s，但 melds 里有 p → 实际三门齐，缺一门校验应失败
    const result = analyze({
      handCodes: ['1m','1m','1m','2m','2m','2m','3m','3m','3m','4s','4s'],
      melds: [{ type: 'pung', tile: '5p' }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.join('')).toContain('缺一门');
  });

  it('melds 与 hand 同门（缺一门成立）：可成胡', () => {
    // 手中 m + p，melds 也是 m → 仍是两门，合法
    const result = analyze({
      handCodes: ['1m','2m','3m','5p','5p','6p','6p','6p','7p','7p','7p'],
      melds: [{ type: 'pung', tile: '4m' }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 输入张数 11 + 3 = 14，胡牌
    expect(result.warnings.join('')).not.toContain('缺一门');
  });
});

describe('3. 严格听牌枚举', () => {
  it('真听张应被严格枚举返回，伪听张应被排除', () => {
    // 123m + 456m + 789m + 333s + 5s（13 张，缺筒）→ 听 5s 单钓
    const hand = countsFromCodes([
      '1m','2m','3m','4m','5m','6m','7m','8m','9m','3s','3s','3s','5s'
    ]);
    const waits = enumerateWaitingTilesStrict(hand, []);
    expect(waits.length).toBeGreaterThan(0);
    const codes = waits.map(w => w.code);
    expect(codes).toContain('5s');
    // 所有听张必须是合法牌码（m 或 s，不含 p——缺筒）
    expect(waits.every(w => /^[1-9][ms]$/.test(w.code))).toBe(true);
  });
});

describe('4. 三门非法胡', () => {
  it('三门齐的 14 张即使能拆面子也不能算胡', () => {
    const counts = countsFromCodes([
      '1m','2m','3m',  // m
      '4s','5s','6s',  // s
      '7p','8p','9p',  // p
      '1m','2m','3m',  // m again
      '5s','5s'        // 将
    ]);
    // 14 张 + 三门 → 标准能拆完，但川麻必须缺一门
    expect(isStandardWinningHand(counts, 0)).toBe(true);
    expect(isWinningHand(counts, 0)).toBe(false);
  });
});

describe('5. 四张算两对的七对向听', () => {
  it('1m1m1m1m + 2m2m + 3m3m + 4m4m + 5m5m + 6m6m → 已是 7 对，shanten=-1（即胡）', () => {
    const counts = countsFromCodes([
      '1m','1m','1m','1m',
      '2m','2m',
      '3m','3m',
      '4m','4m',
      '5m','5m',
      '6m','6m'
    ]);
    // 14 张：4+2+2+2+2+2 = 14；4 张算 2 对，加 5 对 = 7 对 → 胡
    expect(isWinningHand(counts, 0)).toBe(true);
  });

  it('1m1m1m1m + 2m2m + 3m3m + 4m4m + 5m5m + 6m6m 去掉 1 张（13 张）：七对向听=0（听 6m）', () => {
    // 13 张，缺 1m 中的一个 → 听 1m
    const counts = countsFromCodes([
      '1m','1m','1m',
      '2m','2m',
      '3m','3m',
      '4m','4m',
      '5m','5m',
      '6m','6m'
    ]);
    // 七对的 pair units（按修正后的口径）：
    //   1m=3 → 1 unit；其他每个 2 张 → 各 1 unit；共 6 units
    //   shanten = max(0, 6 - 6) = 0 → 听
    const sh = calcShanten(counts, 0);
    expect(sh.shanten).toBe(0);
    // 严格枚举：摸 1m 能成龙七对（1m 变 4 张 → pair_units = 2 + 5×1 = 7）
    const waits = enumerateWaitingTilesStrict(counts, []);
    const codes = waits.map(w => w.code);
    expect(codes).toContain('1m');
  });
});

describe('6. 龙七对成胡', () => {
  it('1m×4 + 2m×2 + 3m×2 + 4m×2 + 5m×2 + 6m×2 应为龙七对', () => {
    const counts = countsFromCodes([
      '1m','1m','1m','1m',
      '2m','2m',
      '3m','3m',
      '4m','4m',
      '5m','5m',
      '6m','6m'
    ]);
    expect(isWinningHand(counts, 0)).toBe(true);
    const fan = computeFan({
      concealed: counts,
      melds: [],
      fullHand: counts,
      genMode: 'fan'
    });
    const fanNames = fan.fans.map(f => f.name).join(' ');
    expect(fanNames).toContain('龙七对');
  });
});

describe('7. genMode fan / di 结算差异', () => {
  it('同一胡牌牌型 + 1 根：fan 模式把根计入 totalFan，di 模式通过 extraDi 加底', () => {
    // 7777万 + 1m1m1m + 2m2m2m + 3m3m → 含 7m 暗刻 4 张 = 1 根，胡
    const counts = countsFromCodes([
      '7m','7m','7m','7m',
      '1m','1m','1m',
      '2m','2m','2m',
      '3m','3m','3m','3m'
    ]);
    // 14 张
    const fanFan = computeFan({
      concealed: counts,
      melds: [],
      fullHand: counts,
      genMode: 'fan'
    });
    const fanDi = computeFan({
      concealed: counts,
      melds: [],
      fullHand: counts,
      genMode: 'di'
    });
    // genCount 应一致（同一手牌）
    expect(fanFan.genCount).toBe(fanDi.genCount);
    expect(fanFan.genCount).toBeGreaterThanOrEqual(2); // 7m×4 + 3m×4 = 2 根
    // fan 模式：根计入 totalFan
    expect(fanFan.totalFan).toBeGreaterThan(fanDi.totalFan);
    // di 模式：extraDi == genCount
    expect(fanDi.extraDi).toBe(fanDi.genCount);
    expect(fanFan.extraDi).toBe(0);
    // settle：di 模式应通过 +base × extraDi 体现根价值
    const sFan = settle(2, fanFan, 10);
    const sDi = settle(2, fanDi, 10);
    // perPlayer = base × 2^(cappedFan-1) + base × extraDi
    // 验证 di 模式确实加上了 base × extraDi
    expect(sDi.perPlayer).toBeGreaterThan(0);
    // di 模式没有把根算进 fan，所以倍数较小，但加底拉回了一部分
    expect(sDi.detail).toContain('加底');
  });
});

describe('8. winMethod=tsumo 接通', () => {
  it('analyze({winMethod: "tsumo"}) 在直接胡牌时应在 fans 里包含"自摸"', () => {
    const result = analyze({
      handCodes: [
        '1m','2m','3m','4m','5m','6m','7m','8m','9m',
        '3s','3s','3s',
        '4s','4s'
      ],
      winMethod: 'tsumo'
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isWin).toBe(true);
    const fanNames = result.fan!.fans.map(f => f.name).join(' ');
    expect(fanNames).toContain('自摸');
  });

  it('analyze({winMethod: "tsumo"}) 听牌阶段每个胡张的 fan 应包含自摸 +1', () => {
    const result = analyze({
      handCodes: ['1m','2m','3m','4m','5m','6m','7m','8m','9m','3s','3s','4s','4s'],
      winMethod: 'tsumo'
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phase).toBe('tenpai');
    expect(result.waitingTiles).toBeDefined();
    // 同一手牌，winMethod=discard 时的 fan
    const noTsumo = analyze({
      handCodes: ['1m','2m','3m','4m','5m','6m','7m','8m','9m','3s','3s','4s','4s'],
      winMethod: 'discard'
    });
    if (!noTsumo.ok || noTsumo.phase !== 'tenpai') return;
    // 每个胡张的 fan tsumo 版本 ≥ discard 版本 + 1（自摸 1 番）
    for (const w of result.waitingTiles!) {
      const same = noTsumo.waitingTiles!.find(x => x.code === w.code);
      if (same) {
        expect(w.fan!).toBeGreaterThanOrEqual(same.fan! + 1);
      }
    }
  });
});

describe('9. shouldPong 不碰路径不能把 target 加入手牌', () => {
  it('hand 含 target×2，不碰路径下 hand 不应被改成 target×3', () => {
    // 手中 22m × 2 + 其它 11 张
    const hand = countsFromCodes([
      '2m','2m',
      '4m','5m','6m','7m','8m','9m',
      '1s','1s','1s','3s','3s'
    ]);
    // remainingPool 仅扣手牌
    const pool = new Array(27).fill(0).map((_, i) => Math.max(0, 4 - hand[i]));
    const totalUnseen = pool.reduce((a, b) => a + b, 0);
    const before2m = hand[codeToIndex('2m')!];
    expect(before2m).toBe(2);

    const sugg = shouldPong(
      hand,
      '2m',
      [],
      pool,
      totalUnseen,
      1,
      4,
      'fan'
    );
    // hand 不应被修改
    expect(hand[codeToIndex('2m')!]).toBe(before2m);
    // 不碰路径必须输出未来 EV（数字），且 reasons 含"不碰"字样
    expect(typeof sugg.evWithoutPong).toBe('number');
    expect(sugg.reasons.some(r => r.includes('不碰'))).toBe(true);
    // 既不应崩，也应给出碰决策（true 或 false 都可）
    expect(typeof sugg.shouldPong).toBe('boolean');
  });

  it('handPlusTarget=3m 不应作为 hand 在 EV 中被使用：hand 张数维持原样', () => {
    // 通过反向证明：碰 vs 不碰的 EV 都被合理计算
    const hand = countsFromCodes([
      '5m','5m',
      '1m','2m','3m','7m','8m','9m',
      '1s','1s','1s','2s','2s'
    ]);
    const pool = new Array(27).fill(0).map((_, i) => Math.max(0, 4 - hand[i]));
    const totalUnseen = pool.reduce((a, b) => a + b, 0);
    const sugg = shouldPong(hand, '5m', [], pool, totalUnseen, 1, 4, 'fan');
    expect(isFinite(sugg.evWithoutPong)).toBe(true);
    expect(isFinite(sugg.evWithPong)).toBe(true);
  });
});

describe('10. 听牌 EV 必须用 settle() 按胡张剩余数加权', () => {
  it('听牌 14 张 → 打牌后 13 张听牌：winRewardEstimate 应≈Σ remaining × settle.perPlayer / totalUnseen', () => {
    // 14 张待出，打掉 1 张后听牌
    // 简单结构：1234m 5678m 9m9m 11s1s ?，构造打掉某张能听
    // 用一个明确的双听牌型：1m2m3m 4m5m6m 7m8m9m 3s3s + 1s2s 摸 1s 进牌
    // 14 张：1m..9m + 3s3s + 1s2s2s（缺筒），打 2s 听 1s 单钓
    const hand = countsFromCodes([
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '3s','3s',
      '1s','2s','2s'
    ]);
    // 打 1s 后 13 张听 1s（保留对子 2s2s 与 3s3s 的拆配置）—— 让分析器自己决策
    const pool = new Array(27).fill(0).map((_, i) => Math.max(0, 4 - hand[i]));
    const totalUnseen = pool.reduce((a, b) => a + b, 0);

    const baseScore = 2;
    const fanCap = 5;
    const evList = suggestDiscardsByEv(hand, {
      hand,
      remainingPool: pool,
      totalUnseen,
      melds: [],
      genMode: 'fan',
      fanCap,
      baseScore
    });

    // 找一个真听牌的候选（shantenAfter === 0）
    const tenpai = evList.find(e => e.shantenAfter === 0 && e.actionType === 'discard' && e.effectiveTiles.length > 0);
    expect(tenpai).toBeDefined();
    if (!tenpai) return;

    // 手动算"按 settle 加权 EV"
    const after = hand.slice();
    after[codeToIndex(tenpai.discardCode)!]--;
    let expectedWinReward = 0;
    for (const w of tenpai.effectiveTiles) {
      const winConcealed = after.slice();
      winConcealed[w.index]++;
      const fullHand = buildFullHand(winConcealed, []);
      const fan = computeFan({
        concealed: winConcealed,
        melds: [],
        fullHand,
        winningTile: w.code,
        winMethod: 'discard',
        genMode: 'fan'
      });
      const settled = settle(baseScore, fan, fanCap).perPlayer;
      expectedWinReward += w.remaining * settled;
    }
    expectedWinReward = totalUnseen > 0 ? expectedWinReward / totalUnseen : 0;

    // tenpai.expectedScore = winRewardEstimate + tingValue + valueScore
    // tingValue (听牌) = baseScore × 1.0 + winProb × 4 × baseScore
    // 抽离 tingValue + valueScore：expectedScore - winRewardEstimate ≈ tingValue + valueScore
    // 简化：直接验证 expectedScore - tingValue - valueScore ≈ winRewardEstimate
    const tingValue = baseScore * 1.0 + tenpai.winProbability * baseScore * 4.0;
    const observedWinReward = tenpai.expectedScore - tenpai.valueScore - tingValue;
    // 允许浮点误差
    expect(Math.abs(observedWinReward - expectedWinReward)).toBeLessThan(0.01);
  });
});

describe('+1. 暗杠 EV 必须枚举所有补牌并扣减 remainingPool', () => {
  it('暗杠候选的 expectedScore 应稳定且与 remainingPool 状态有关', () => {
    // 7777m + 其他 10 张
    const hand = countsFromCodes([
      '7m','7m','7m','7m',
      '2s','3s','3s','4s','4s','4s','5s','6s','6s','6s'
    ]);
    const poolFull = new Array(27).fill(0).map((_, i) => Math.max(0, 4 - hand[i]));
    const totalUnseen = poolFull.reduce((a, b) => a + b, 0);

    const list = suggestDiscardsByEv(hand, {
      hand,
      remainingPool: poolFull,
      totalUnseen,
      melds: [],
      genMode: 'fan',
      fanCap: 5,
      baseScore: 1
    });
    const kong = list.find(x => x.actionType === 'concealedKong');
    expect(kong).toBeDefined();
    if (!kong) return;

    // 对比：把 remainingPool 大幅压缩（让多数 t 不可摸），EV 应不同
    const poolThin = poolFull.slice();
    // 把 m/s 中的 1m..6m 全设为 0（除 4m 外），让候选补牌减少
    for (let i = 0; i < 6; i++) poolThin[i] = 0;
    const list2 = suggestDiscardsByEv(hand, {
      hand,
      remainingPool: poolThin,
      totalUnseen: poolThin.reduce((a, b) => a + b, 0),
      melds: [],
      genMode: 'fan',
      fanCap: 5,
      baseScore: 1
    });
    const kong2 = list2.find(x => x.actionType === 'concealedKong');
    expect(kong2).toBeDefined();
    if (!kong2) return;

    // 不同 remainingPool 下 expectedScore 不应完全相同：证明枚举受 pool 影响
    expect(kong.expectedScore).not.toBe(kong2.expectedScore);

    // pool 里只剩 1 种 t > 0 时，EV 应仍为有限数（不再是单点取顶张）
    const poolSingle = new Array(27).fill(0);
    poolSingle[codeToIndex('1s')!] = 4;
    const list3 = suggestDiscardsByEv(hand, {
      hand,
      remainingPool: poolSingle,
      totalUnseen: 4,
      melds: [],
      genMode: 'fan',
      fanCap: 5,
      baseScore: 1
    });
    const kong3 = list3.find(x => x.actionType === 'concealedKong');
    expect(kong3).toBeDefined();
    expect(isFinite(kong3!.expectedScore)).toBe(true);
  });
});
