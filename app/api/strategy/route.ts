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
      // 计算可见牌
      const visibleCodes = Array.isArray(body.visibleCodes) ? body.visibleCodes : [];
      const visible = countsFromCodes(visibleCodes);
      const remainingPool = new Array(27).fill(0).map((_, i) =>
        Math.max(0, 4 - hand[i] - (visible[i] || 0))
      );
      const totalUnseen = remainingPool.reduce((a: number, b: number) => a + b, 0);
      const result = shouldPong(hand, targetCode, melds, remainingPool, totalUnseen, baseScore, fanCap, genMode);
      return NextResponse.json({ ok: true, mode, result });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? '策略分析失败' }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: 'unreachable' }, { status: 500 });
}
