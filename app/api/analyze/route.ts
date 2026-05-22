import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/mahjong';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handCodes = Array.isArray(body.handCodes) ? body.handCodes : [];
    const visibleCodes = Array.isArray(body.visibleCodes) ? body.visibleCodes : [];
    const meldCount = typeof body.meldCount === 'number' ? body.meldCount : 0;
    const melds = Array.isArray(body.melds) ? body.melds : undefined;
    const isHaidi = !!body.isHaidi;
    const genMode = body.genMode === 'di' ? 'di' : 'fan';
    const baseScore = typeof body.baseScore === 'number' ? body.baseScore : 1;
    const fanCap = typeof body.fanCap === 'number' ? body.fanCap : 4;

    const result = analyze({
      handCodes,
      visibleCodes,
      meldCount,
      melds,
      isHaidi,
      genMode,
      baseScore,
      fanCap
    });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? '分析失败' }, { status: 400 });
  }
}
