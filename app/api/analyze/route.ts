import { NextRequest, NextResponse } from 'next/server';
import { analyze, Objective } from '@/lib/mahjong';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '请求体解析失败' }, { status: 400 });
  }

  const handCodes = Array.isArray(body.handCodes) ? body.handCodes : [];
  const visibleCodes = Array.isArray(body.visibleCodes) ? body.visibleCodes : [];
  const meldCount = typeof body.meldCount === 'number' ? body.meldCount : 0;
  const melds = Array.isArray(body.melds) ? body.melds : undefined;
  const isHaidi = !!body.isHaidi;
  const isAfterKong = !!body.isAfterKong;
  const isKongDischarge = !!body.isKongDischarge;
  const isRobKong = !!body.isRobKong;
  const isHeavenly = !!body.isHeavenly;
  const isEarthly = !!body.isEarthly;
  const wallLeft =
    typeof body.wallLeft === 'number' && isFinite(body.wallLeft) && body.wallLeft >= 0
      ? Math.floor(body.wallLeft)
      : undefined;
  const genMode = body.genMode === 'di' ? 'di' : 'fan';
  const winMethod = body.winMethod === 'tsumo' ? 'tsumo' : 'discard';
  const baseScore = typeof body.baseScore === 'number' ? body.baseScore : 1;
  const fanCap = typeof body.fanCap === 'number' ? body.fanCap : 4;
  const objective: Objective =
    body.objective === 'speed' ? 'speed' : 'expectedScore';

  try {
    const result = analyze({
      handCodes,
      visibleCodes,
      meldCount,
      melds,
      isHaidi,
      isAfterKong,
      isKongDischarge,
      isRobKong,
      isHeavenly,
      isEarthly,
      wallLeft,
      genMode,
      winMethod,
      baseScore,
      fanCap,
      objective
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? '分析失败' }, { status: 400 });
  }
}
