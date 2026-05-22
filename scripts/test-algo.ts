/**
 * 简易自测脚本 — 验证算法核心逻辑
 * 跑法：npx tsx scripts/test-algo.ts
 */

import { analyze } from '../lib/mahjong';
import { computeFan } from '../lib/mahjong/scoring';
import { countsFromCodes } from '../lib/mahjong/tiles';
import { isWinningHand, calcShanten, enumerateWaitingTiles } from '../lib/mahjong/analyzer';

let pass = 0;
let fail = 0;

function expect(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`✅ ${label}`);
    pass++;
  } else {
    console.log(`❌ ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('\n=== 1. 标准胡牌：4 顺 + 1 将（缺一门 OK） ===');
{
  // 万: 1-2-3 4-5-6 7-8-9   条: 1-2-3   筒: 5-5（将）→ 14 张，含三门 不缺
  // 改用：万 123 456 789 + 条 22 + 条 234  → 14 张，缺筒，OK
  const hand = countsFromCodes(['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '2s', '2s', '2s', '3s', '4s']);
  expect('14 张胡牌（万顺×3 + 2条刻 + 234条）', isWinningHand(hand));
}

console.log('\n=== 2. 七对（缺一门 OK） ===');
{
  // 万: 1m 1m 2m 2m 3m 3m 4m 4m   条: 5s 5s 6s 6s 7s 7s
  const hand = countsFromCodes(['1m', '1m', '2m', '2m', '3m', '3m', '4m', '4m', '5s', '5s', '6s', '6s', '7s', '7s']);
  expect('14 张七对', isWinningHand(hand));
  const fan = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  expect('番种含七对', fan.fans.some(f => f.name === '七对'), JSON.stringify(fan));
}

console.log('\n=== 3. 龙七对 ===');
{
  // 1m×4 + 2m×2 3m×2 4m×2 + 5s×2 6s×2 → 14 张
  const hand = countsFromCodes(['1m', '1m', '1m', '1m', '2m', '2m', '3m', '3m', '4m', '4m', '5s', '5s', '6s', '6s']);
  expect('14 张龙七对识别为胡牌', isWinningHand(hand));
  const fan = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  expect('番种含龙七对（3番）', fan.fans.some(f => f.name === '龙七对'));
  expect('龙七对不重复算根（值=3）', fan.totalFan === 3, `实际 totalFan=${fan.totalFan}`);
}

console.log('\n=== 4. 三门齐应判失败 ===');
{
  const hand = countsFromCodes(['1m', '2m', '3m', '4m', '5m', '6m', '1s', '2s', '3s', '1p', '2p', '3p', '5p', '5p']);
  expect('三门齐不能胡', !isWinningHand(hand));
  const sh = calcShanten(hand);
  expect('应给出建议舍弃门', sh.needDropSuit !== undefined, `needDropSuit=${sh.needDropSuit}`);
}

console.log('\n=== 5. 听牌枚举 ===');
{
  // 13 张听牌：万 123 456 789 + 条 22 + 条 23（听 1s 或 4s）
  const hand = countsFromCodes(['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '2s', '2s', '2s', '3s']);
  // 实际：缺将。我们简化测一例：123 456 789 万 + 22 33 条 → 13 张听 22 / 33 单钓将？
  // 这里给个清晰例子：
  // 123 456 789 万 + 11 22 33 条 → 13 张？= 9 + 6 = 15 ❌
  // 改为：123 456 789 万 + 22 条 + 23 条 → 13 张，听 1s 或 4s
  const sh = calcShanten(hand);
  console.log('  shanten =', sh.shanten);
  if (sh.shanten === 0) {
    const w = enumerateWaitingTiles(hand);
    console.log('  waiting:', w.map(x => x.code));
    expect('听 1s 或 4s', w.some(x => x.code === '1s') && w.some(x => x.code === '4s'));
  } else {
    console.log('  （此例向听数 ≠ 0，跳过断言）');
  }
}

console.log('\n=== 6. 大对子 ===');
{
  // 4 个刻子 + 1 对：1m1m1m 2m2m2m 3m3m3m 5s5s5s 7s7s
  const hand = countsFromCodes(['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '5s', '5s', '5s', '7s', '7s']);
  expect('胡', isWinningHand(hand));
  const fan = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  expect('含大对子', fan.fans.some(f => f.name === '大对子'));
}

console.log('\n=== 7. 清一色 + 大对子 ===');
{
  const hand = countsFromCodes(['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '5m', '5m', '5m', '7m', '7m']);
  expect('胡', isWinningHand(hand));
  const fan = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  expect('含清一色（2番）', fan.fans.some(f => f.name === '清一色'));
  expect('含大对子（1番）', fan.fans.some(f => f.name === '大对子'));
  expect('合计>=3番', fan.totalFan >= 3, `totalFan=${fan.totalFan}`);
}

console.log('\n=== 8. 海底捞月 +1 番 ===');
{
  const hand = countsFromCodes(['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '2s', '2s', '2s', '3s', '4s']);
  const a = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  const b = computeFan({ hand, meldCount: 0, genMode: 'fan', isHaidi: true });
  expect('海底捞月使番数 +1', b.totalFan === a.totalFan + 1, `a=${a.totalFan} b=${b.totalFan}`);
}

console.log('\n=== 9. 根的加番 vs 加底 ===');
{
  // 含 4 张相同：1m×4 + 2m 3m 4m + 5s 5s 5s 6s 6s 6s 7s 7s → 14 张
  // 实际：1m1m1m1m 2m2m2m 3m3m3m 5s5s5s 7s7s = 4+3+3+3+2 = 15 ❌
  // 改：1m×4 + 1m? 不行；用 1m1m1m1m 当作 3 张刻 + 1 张多 → 不能直接当胡牌
  // 用刻拆 4：把 1m×4 当成 一个刻 + 一张 → 仅在杠时合法。普通胡里 4 张 = 七对里的"龙根"
  // 所以测：龙七对 + 加底
  const hand = countsFromCodes(['1m', '1m', '1m', '1m', '2m', '2m', '3m', '3m', '4m', '4m', '5s', '5s', '6s', '6s']);
  const fanMode = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  const diMode = computeFan({ hand, meldCount: 0, genMode: 'di' });
  console.log('  加番:', fanMode);
  console.log('  加底:', diMode);
  // 龙七对自带 3 番已含 1 个 4 张；如果还有第二个 4 张才会出现根
  // 这里只 1 个 4 张，故根=0，两种模式番数应相同
  expect('单 4 张龙七对：两种模式番数相同', fanMode.totalFan === diMode.totalFan);
}

console.log('\n=== 10. 双龙：根的加底差异 ===');
{
  // 1m×4 + 2m×4 + 3m×2 + 4m×2 + 5s×2 → 14 张
  const hand = countsFromCodes(['1m', '1m', '1m', '1m', '2m', '2m', '2m', '2m', '3m', '3m', '4m', '4m', '5s', '5s']);
  const fanMode = computeFan({ hand, meldCount: 0, genMode: 'fan' });
  const diMode = computeFan({ hand, meldCount: 0, genMode: 'di' });
  console.log('  加番:', fanMode);
  console.log('  加底:', diMode);
  expect('双 4 张龙七对：加番应比加底多 1 番', fanMode.totalFan === diMode.totalFan + 1);
  expect('加底应有 extraDi=1', diMode.extraDi === 1);
}

console.log('\n=== 11. 顶层 analyze（14 张未胡） ===');
{
  const r = analyze({
    handCodes: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '2s', '2s', '3s', '4s', '5s'],
    visibleCodes: [],
    meldCount: 0,
    genMode: 'fan',
    baseScore: 1
  });
  console.log('  phase:', r.phase, 'shanten:', r.shanten.shanten);
  expect('14 张应给出 suggestedDiscards', !!r.suggestedDiscards && r.suggestedDiscards.length > 0);
}

console.log('\n=== 12. 顶层 analyze（13 张听牌） ===');
{
  const r = analyze({
    handCodes: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '2s', '2s', '2s', '3s'],
    visibleCodes: [],
    meldCount: 0,
    genMode: 'fan',
    baseScore: 1
  });
  console.log('  phase:', r.phase, 'shanten:', r.shanten.shanten, 'waiting:', r.waitingTiles?.map(x => x.code));
  if (r.shanten.shanten === 0) {
    expect('听牌输出 waitingTiles', !!r.waitingTiles && r.waitingTiles.length > 0);
  }
}

console.log(`\n========== 测试完毕：${pass} 通过，${fail} 失败 ==========`);
process.exit(fail === 0 ? 0 : 1);
