import { NextRequest, NextResponse } from 'next/server';
import { suggestDingque, suggestSwap3, shouldPong } from '@/lib/mahjong/strategy';
import { countsFromCodes } from '@/lib/mahjong/tiles';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '请求体解析失败' }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== 'dingque' && mode !== 'swap3' && mode !== 'pong') {
    return NextResponse.json(
      { ok: false, error: 'mode 必须是 dingque / swap3 / pong' },
      { status: 400 }
    );
  }

  const handCodes = Array.isArray(body.handCodes) ? body.handCodes : [];
  if (handCodes.length === 0) {
    return NextResponse.json({ ok: false, error: '缺少 handCodes' }, { status: 400 });
  }
  for (const c of handCodes) {
    if (typeof c !== 'string' || !/^[1-9][msp]$/.test(c)) {
      return NextResponse.json({ ok: false, error: `非法牌码 ${c}` }, { status: 400 });
    }
  }
  const hand = countsFromCodes(handCodes);

  try {
    if (mode === 'dingque') {
      const result = suggestDingque(hand);
      return NextResponse.json({ ok: true, mode, result });
    }
    if (mode === 'swap3') {
      const result = suggestSwap3(hand);
      return NextResponse.json({ ok: true, mode, result });
    }
    if (mode === 'pong') {
      const targetCode = body.targetCode;
      if (typeof targetCode !== 'string' || !/^[1-9][msp]$/.test(targetCode)) {
        return NextResponse.json({ ok: false, error: '缺少合法 targetCode' }, { status: 400 });
      }
      const melds = Array.isArray(body.melds) ? body.melds : [];
      const baseScore = typeof body.baseScore === 'number' && body.baseScore > 0 ? body.baseScore : 1;
      const fanCap = typeof body.fanCap === 'number' && body.fanCap >= 0 ? body.fanCap : 4;
      const genMode = body.genMode === 'di' ? 'di' : 'fan';
      const winMethod = body.winMethod === 'tsumo' ? 'tsumo' : 'discard';

      // 已见牌：visibleCodes（场上弃牌等）
      const visibleCodes = Array.isArray(body.visibleCodes) ? body.visibleCodes : [];
      const visible = countsFromCodes(visibleCodes);

      // 已碰/杠副的牌也是已见牌（每副 pung 占 3 张，kong 占 4 张）
      const meldTiles = new Array(27).fill(0);
      for (const m of melds) {
        if (!m || typeof m !== 'object') continue;
        if (m.type !== 'pung' && m.type !== 'kong') continue;
        if (typeof m.tile !== 'string' || !/^[1-9][msp]$/.test(m.tile)) continue;
        const idx = (parseInt(m.tile[0], 10) - 1) + (m.tile[1] === 'm' ? 0 : m.tile[1] === 's' ? 9 : 18);
        meldTiles[idx] += m.type === 'kong' ? 4 : 3;
      }

      // remainingPool = 4 - hand - visible - meldTiles，且至少为 0
      // targetCode 进入 shouldPong 后会再扣 1（在 strategy.ts 的 shouldPong 里）
      const remainingPool = new Array(27).fill(0).map((_, i) =>
        Math.max(0, 4 - hand[i] - (visible[i] || 0) - meldTiles[i])
      );
      const totalUnseen = remainingPool.reduce((a: number, b: number) => a + b, 0);
      const result = shouldPong(
        hand,
        targetCode,
        melds,
        remainingPool,
        totalUnseen,
        baseScore,
        fanCap,
        genMode,
        undefined,
        winMethod
      );
      return NextResponse.json({ ok: true, mode, result });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? '策略分析失败' }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: 'unreachable' }, { status: 500 });
}
