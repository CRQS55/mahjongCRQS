import { NextRequest, NextResponse } from 'next/server';
import { genTenpaiHand, genNotenHand, genGameScene } from '@/lib/mahjong/quiz-gen';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 't1';
  try {
    if (type === 't1') {
      const q = genTenpaiHand();
      return NextResponse.json({ ok: true, type, ...q });
    }
    if (type === 't2') {
      const q = genNotenHand();
      return NextResponse.json({ ok: true, type, ...q });
    }
    if (type === 't3') {
      const q = genGameScene();
      return NextResponse.json({ ok: true, type, ...q });
    }
    return NextResponse.json({ ok: false, error: 'unknown type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'failed' }, { status: 500 });
  }
}
