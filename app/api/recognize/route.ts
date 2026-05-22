/**
 * /api/recognize
 *
 * 接收一张图片（base64 dataURL），调用 Claude Vision 识别四川麻将手牌。
 * 直接使用 fetch 而非 SDK，以便兼容各种中转端点（如只支持最小请求体的反代）。
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `你是一个四川麻将手牌识别专家。用户会发来一张照片，里面是玩家手中的麻将牌。
请仔细识别出每一张牌（只可能是万 m / 条 s / 筒 p 三门，1-9 点数）。
四川麻将不含字牌、东南西北、中发白、花牌——如果你看到这些请忽略。

输出严格的 JSON，不要任何额外解释，结构如下：
{
  "tiles": ["1m","2m","3m","5s","5s","9p"],
  "confidence": 0.0-1.0,
  "notes": "简短说明，如有歧义请提及"
}

牌码规则：
- 数字 + 花色字母
- 万: m   条: s   筒: p
- 例如 "5m" 表示 5 万；"7s" 表示 7 条；"9p" 表示 9 筒
- 一张牌就是一个字符串元素，如果同样的牌有 3 张就重复 3 次

请按照从左到右、从上到下的顺序识别。手牌通常 13 或 14 张。`;

interface RecognizeBody {
  image?: string;
  mediaType?: string;
}

interface RecognizeResponse {
  ok: boolean;
  tiles?: string[];
  confidence?: number;
  notes?: string;
  error?: string;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB（识别接口）
const MAX_BASE64_LEN = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 256;

function isValidBase64(s: string): boolean {
  if (typeof s !== 'string' || s.length === 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(s);
}

export async function POST(req: NextRequest): Promise<NextResponse<RecognizeResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: '服务器未配置 ANTHROPIC_API_KEY，请在 Vercel 环境变量中设置' },
      { status: 500 }
    );
  }

  let body: RecognizeBody;
  try {
    body = (await req.json()) as RecognizeBody;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体解析失败' }, { status: 400 });
  }

  if (!body.image || typeof body.image !== 'string') {
    return NextResponse.json({ ok: false, error: '缺少 image 字段' }, { status: 400 });
  }

  // 大小限制（保守按字符串长度估算）
  if (body.image.length > MAX_BASE64_LEN) {
    return NextResponse.json(
      { ok: false, error: `图片过大（>${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)}MB），请压缩后重试` },
      { status: 413 }
    );
  }

  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  let base64 = body.image;
  const m = body.image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (m) {
    const mt = m[1];
    if (mt === 'image/png' || mt === 'image/gif' || mt === 'image/webp') mediaType = mt as any;
    else mediaType = 'image/jpeg';
    base64 = m[2];
  } else if (body.mediaType) {
    if (
      body.mediaType === 'image/png' ||
      body.mediaType === 'image/gif' ||
      body.mediaType === 'image/webp'
    ) {
      mediaType = body.mediaType as any;
    }
  }

  if (!isValidBase64(base64)) {
    return NextResponse.json({ ok: false, error: 'image 不是合法的 base64 字符串' }, { status: 400 });
  }

  const baseURL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const requestBody = {
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64
            }
          },
          {
            type: 'text',
            text: `${SYSTEM_PROMPT}\n\n请识别上面这张图中的麻将牌，输出 JSON。`
          }
        ]
      }
    ]
  };

  try {
    const upstream = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error('[recognize] upstream error', upstream.status, text.slice(0, 500));
      return NextResponse.json(
        { ok: false, error: `上游 ${upstream.status}：${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    let resp: any;
    try {
      resp = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, error: '上游返回非 JSON' }, { status: 502 });
    }

    const blocks = Array.isArray(resp?.content) ? resp.content : [];
    const textBlock = blocks.find((b: any) => b?.type === 'text');
    if (!textBlock?.text) {
      return NextResponse.json({ ok: false, error: '识别返回为空' }, { status: 502 });
    }

    const raw = String(textBlock.text).trim();
    const parsed = extractJson(raw);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: `无法解析模型返回：${raw.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const tilesRaw = Array.isArray(parsed.tiles) ? parsed.tiles.filter(isValidTile) : [];
    // 二次校验：不允许任意一种牌超过 4 张；不允许超过 14 张
    const counter: Record<string, number> = {};
    const tiles: string[] = [];
    for (const t of tilesRaw) {
      counter[t] = (counter[t] ?? 0) + 1;
      if (counter[t] > 4) continue; // 静默丢弃多余
      if (tiles.length >= 14) break;
      tiles.push(t);
    }
    return NextResponse.json({
      ok: true,
      tiles,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      notes: typeof parsed.notes === 'string' ? parsed.notes : undefined
    });
  } catch (err: any) {
    console.error('[recognize] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? '识别服务异常' },
      { status: 500 }
    );
  }
}

function isValidTile(s: any): s is string {
  if (typeof s !== 'string' || s.length !== 2) return false;
  const r = parseInt(s[0], 10);
  const u = s[1];
  return Number.isInteger(r) && r >= 1 && r <= 9 && (u === 'm' || u === 's' || u === 'p');
}

function extractJson(raw: string): any | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
