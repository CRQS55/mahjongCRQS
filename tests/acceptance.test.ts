/**
 * 验收测试：覆盖任务书中的 9 大验收点
 */

import { describe, it, expect } from 'vitest';
import {
  analyze,
  isStandardWinningHand,
  isSevenPairsWinningHand,
  isLongChitoitsuWinningHand,
  isWinningHand,
  enumerateWaitingTilesStrict
} from '@/lib/mahjong';
import { countsFromCodes } from '@/lib/mahjong/tiles';

function ok<T extends { ok: true }>(res: { ok: true } | { ok: false }): T {
  expect(res.ok).toBe(true);
  return res as T;
}

describe('一致性：suggestDiscards 不应给出 shantenAfter=0 但 effectiveTiles 为空的建议', () => {
  it('随机若干用例下，shantenAfter===0 必须意味着真实有听牌', () => {
    const cases = [
      ['1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '9m', '9m', '5s'],
      ['2m', '3m', '4m', '5m', '6m', '7m', '8m', '8m', '1s', '1s', '2s', '3s', '4s', '9p'],
      ['7m', '7m', '7m', '7m', '2s', '3s', '3s', '4s', '4s', '4s', '5s', '6s', '6s', '6s'],
      ['1m', '1m', '2m', '2m', '3m', '3m', '4m', '4m', '5m', '5m', '6m', '6m', '7m', '8m']
    ];
    for (const handCodes of cases) {
      const result = analyze({ handCodes });
      if (!result.ok) continue;
      const sugg = result.suggestedDiscards ?? [];
      for (const s of sugg) {
        if (s.shantenAfter === 0) {
          expect(s.effectiveTiles.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('7777万 2334445666条 打 2s 不应同时是 1 向听 + 进张 0 张', () => {
    const handCodes = [
      '7m', '7m', '7m', '7m',
      '2s', '3s', '3s', '4s', '4s', '4s', '5s', '6s', '6s', '6s'
    ];
    const result = analyze({ handCodes, objective: 'expectedScore' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const list = result.suggestedDiscards ?? [];
    for (const s of list) {
      // 任何被建议的 discard：要么真听（effectiveCount>0），要么 shantenAfter>=1
      // 但不允许 shantenAfter>=1 时 effectiveCount=0（除非确实是死牌型）
      // 由于 7777m 是真死结构，2/3/4/5/6s 任何一打都至少有"摸某张能下叫"的进张
      if (s.shantenAfter <= 1) {
        expect(s.effectiveCount).toBeGreaterThan(0);
      }
    }
  });
});

describe('EV 排序：保留暗刻 + 听张多优先', () => {
  it('22344678s 567999p：首推应为 2s 或 4s（听 6 张），9p 应在最末（拆 999p 暗刻）', () => {
    const handCodes = ['2s','2s','3s','4s','4s','6s','7s','8s','5p','6p','7p','9p','9p','9p'];
    const result = analyze({ handCodes, objective: 'expectedScore' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const list = result.suggestedDiscards!;
    const top1 = list[0].discardCode;
    expect(['2s', '4s']).toContain(top1);

    const nine = list.find(s => s.discardCode === '9p')!;
    expect(nine).toBeDefined();
    const nineIdx = list.findIndex(s => s.discardCode === '9p');
    expect(nineIdx).toBeGreaterThanOrEqual(5);
    expect(nine.reasons.some(r => r.includes('拆暗刻'))).toBe(true);
  });
});

describe('EV 模式：截图手牌 7777万 2334445666条 不应首推 7m', () => {
  it('EV 模式下：要么首推暗杠 7m，要么不该首推"打 7m"（拆根）', () => {
    const handCodes = [
      '7m', '7m', '7m', '7m',
      '2s', '3s', '3s', '4s', '4s', '4s', '5s', '6s', '6s', '6s'
    ];

    const evResult = analyze({
      handCodes,
      objective: 'expectedScore',
      genMode: 'fan',
      fanCap: 5
    });
    expect(evResult.ok).toBe(true);
    if (!evResult.ok) return;

    const top = evResult.suggestedDiscards?.[0];
    // 首推可以是暗杠 7m，但不能是"打 7m"
    if (top?.discardCode === '7m') {
      expect(top.actionType).toBe('concealedKong');
    }

    // 在所有"打牌"候选里，7m 不应排第一
    const discardOnly = evResult.suggestedDiscards?.filter((x: any) => x.actionType === 'discard') ?? [];
    if (discardOnly.length > 0) {
      expect(discardOnly[0].discardCode).not.toBe('7m');
    }

    // 7m 的"打牌"候选必须存在并标记拆根
    const sevenWanDiscard = evResult.suggestedDiscards?.find(
      (x: any) => x.discardCode === '7m' && x.actionType === 'discard'
    );
    expect(sevenWanDiscard).toBeDefined();
    expect(sevenWanDiscard!.lostGen).toBeGreaterThanOrEqual(1);
    expect(sevenWanDiscard!.reasons.join('')).toContain('拆根');
  });

  it('speed 模式下 7m 仍可能为最快下叫，但"打 7m"理由必须标注拆根/降番', () => {
    const handCodes = [
      '7m', '7m', '7m', '7m',
      '2s', '3s', '3s', '4s', '4s', '4s', '5s', '6s', '6s', '6s'
    ];
    const speedResult = analyze({ handCodes, objective: 'speed', genMode: 'fan', fanCap: 5 });
    expect(speedResult.ok).toBe(true);
    if (!speedResult.ok) return;
    expect(speedResult.suggestedDiscards).toBeDefined();
    const sevenWanDiscard = speedResult.suggestedDiscards?.find(
      (x: any) => x.discardCode === '7m' && x.actionType === 'discard'
    );
    expect(sevenWanDiscard).toBeDefined();
    expect(sevenWanDiscard!.reasons.some((r: string) => r.includes('拆根') || r.includes('降番'))).toBe(true);
  });
});

describe('缺一门：melds 必须参与', () => {
  it('已碰第三门时不能绕过缺一门检查', () => {
    const result = analyze({
      handCodes: ['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4s', '4s'],
      melds: [{ type: 'pung', tile: '5p' }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isWin).toBe(false);
    expect(result.warnings.join('')).toContain('缺一门');
  });
});

describe('胡牌函数拆分', () => {
  it('七对听牌的 winType 应为 chitoitsu，不应被误标为 standard', () => {
    const result = analyze({
      handCodes: ['1s', '1s', '2s', '2s', '4s', '4s', '5s', '5s', '7s', '7s', '8s', '8s', '9s']
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phase).toBe('tenpai');
    expect(result.waitingTiles).toBeDefined();
    expect(result.waitingTiles!.some((w: any) => w.code === '9s' && w.winType === 'chitoitsu')).toBe(true);
  });

  it('isStandardWinningHand / isSevenPairsWinningHand / isLongChitoitsuWinningHand 应该独立可用', () => {
    const sevenPair = countsFromCodes([
      '1s', '1s', '2s', '2s', '4s', '4s', '5s', '5s', '7s', '7s', '8s', '8s', '9s', '9s'
    ]);
    expect(isSevenPairsWinningHand(sevenPair)).toBe(true);
    expect(isStandardWinningHand(sevenPair, 0)).toBe(false);
    expect(isLongChitoitsuWinningHand(sevenPair)).toBe(false);

    const longSevenPair = countsFromCodes([
      '1s', '1s', '1s', '1s', '2s', '2s', '4s', '4s', '5s', '5s', '7s', '7s', '8s', '8s'
    ]);
    expect(isSevenPairsWinningHand(longSevenPair)).toBe(true);
    expect(isLongChitoitsuWinningHand(longSevenPair)).toBe(true);
    expect(isStandardWinningHand(longSevenPair, 0)).toBe(false);

    const standard = countsFromCodes([
      '1m', '2m', '3m', '4m', '4m', '4m', '5m', '5m', '5m', '6m', '7m', '8m', '9m', '9m'
    ]);
    expect(isStandardWinningHand(standard, 0)).toBe(true);
    expect(isSevenPairsWinningHand(standard)).toBe(false);
    expect(isWinningHand(standard, 0)).toBe(true);
  });
});

describe('金钩钓 / 根识别', () => {
  it('四副明刻 + 单吊对子 → 金钩钓', () => {
    const result = analyze({
      handCodes: ['5m', '5m'],
      melds: [
        { type: 'pung', tile: '1m' },
        { type: 'pung', tile: '2m' },
        { type: 'pung', tile: '3m' },
        { type: 'pung', tile: '4m' }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isWin).toBe(true);
    expect(result.fan).toBeDefined();
    expect(result.fan!.fans.map((f: any) => f.name).some((n: string) => n.includes('金钩钓'))).toBe(true);
  });

  it('明杠应被计入"根"', () => {
    const result = analyze({
      handCodes: ['5m', '5m'],
      melds: [
        { type: 'kong', tile: '1m' },
        { type: 'pung', tile: '2m' },
        { type: 'pung', tile: '3m' },
        { type: 'pung', tile: '4m' }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isWin).toBe(true);
    const fanNames = result.fan!.fans.map((f: any) => f.name).join(' ');
    expect(/根/.test(fanNames)).toBe(true);
  });
});

describe('API 输入合法性', () => {
  it('五张同牌应直接拒绝', () => {
    const response = analyze({
      handCodes: ['1m', '1m', '1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4m', '4m', '5m']
    });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.error).toMatch(/超过4张|非法手牌/);
  });

  it('负数 baseScore 和 fanCap 应拒绝', () => {
    const response = analyze({
      handCodes: ['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4m', '4m', '4m', '5m', '5m'],
      baseScore: -10,
      fanCap: -1
    });
    expect(response.ok).toBe(false);
  });

  it('非法 tile code 应被拒绝', () => {
    const response = analyze({
      handCodes: ['10m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4m', '4m', '4m', '5m', '5m']
    });
    expect(response.ok).toBe(false);
  });
});

describe('严格听牌枚举', () => {
  it('enumerateWaitingTilesStrict 在含 melds 时仍能找到真实听张', () => {
    const hand = countsFromCodes(['5m', '6m', '7m', '8m']);
    const waits = enumerateWaitingTilesStrict(hand, [
      { type: 'pung', tile: '1m' },
      { type: 'pung', tile: '2m' },
      { type: 'pung', tile: '3m' }
    ]);
    const codes = waits.map(w => w.code).sort();
    expect(codes.length).toBeGreaterThan(0);
  });

  it('shanten=0 但实际拆开后没有真听张时不应误判为 tenpai', () => {
    const handCodes = ['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4m', '4m', '4m', '5m'];
    const result = analyze({ handCodes });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.phase === 'tenpai') {
      expect(result.waitingTiles!.length).toBeGreaterThan(0);
    }
  });
});
