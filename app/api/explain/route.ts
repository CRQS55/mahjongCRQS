/**
 * /api/explain
 *
 * 接收上下文（手牌、推荐选择、用户选择、可见牌等），调用 Claude 给出
 * "为什么这个选择好/不好" 的人话解释。
 *
 * 两种模式：
 *  - mode = "main"   : 解释为什么主界面给出的推荐打法是最优的
 *  - mode = "quizT2" : 测试水平 t2 — 解释为什么用户的选择不如最佳选择
 *  - mode = "quizT3" : 测试水平 t3 — 同 t2，但带可见牌上下文
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DiscardCandidate {
  code: string;
  rank?: number;
  effectiveCount?: number;
  effectiveTiles?: { code: string; remaining: number }[];
  expectedScore?: number;
  speedScore?: number;
  valueScore?: number;
  shantenAfter?: number;
  averageFan?: number;
  maxFanPotential?: number;
  reasons?: string[];
  actionType?: string;
}

interface ExplainBody {
  mode?: 'main' | 'quizT2' | 'quizT3' | 'mainTenpai';
  handCodes?: string[];
  visibleCodes?: string[];
  melds?: { type: 'pung' | 'kong'; tile: string }[];
  // main 模式：推荐的最佳出牌列表（top N）
  recommendedDiscards?: DiscardCandidate[];
  // quiz 模式：用户选择 + 最佳选择
  userChoice?: string;
  bestDiscards?: DiscardCandidate[];
  // 听牌模式
  waitingTiles?: { code: string; remaining: number; fan?: number; winType?: string }[];
  shanten?: number;
  // 设置
  genMode?: 'fan' | 'di';
}

interface ExplainResponse {
  ok: boolean;
  explanation?: string;
  error?: string;
}

const SUIT_NAME: Record<string, string> = { m: '万', s: '条', p: '筒' };

function tileToText(code: string): string {
  if (!code || code.length < 2) return code;
  const r = code[0];
  const s = SUIT_NAME[code[1]] ?? code[1];
  return `${r}${s}`;
}

function tilesToText(codes: string[] | undefined): string {
  if (!codes || codes.length === 0) return '（无）';
  return codes.map(tileToText).join('、');
}

function meldsToText(melds: ExplainBody['melds']): string {
  if (!melds || melds.length === 0) return '（无）';
  return melds
    .map(m => `${m.type === 'kong' ? '杠' : '碰'}${tileToText(m.tile)}`)
    .join('、');
}

function discardToText(d: DiscardCandidate): string {
  const parts: string[] = [tileToText(d.code)];
  if (typeof d.shantenAfter === 'number') parts.push(`打后向听=${d.shantenAfter}`);
  if (typeof d.effectiveCount === 'number') parts.push(`有效进张=${d.effectiveCount}张`);
  if (d.effectiveTiles && d.effectiveTiles.length > 0) {
    const tilesStr = d.effectiveTiles.map(t => `${tileToText(t.code)}(剩${t.remaining})`).join('、');
    parts.push(`进张明细：${tilesStr}`);
  }
  if (typeof d.expectedScore === 'number') parts.push(`综合分=${d.expectedScore.toFixed(2)}`);
  if (typeof d.speedScore === 'number') parts.push(`下叫速度=${d.speedScore.toFixed(2)}`);
  if (typeof d.valueScore === 'number') parts.push(`番数潜力=${d.valueScore.toFixed(2)}`);
  if (typeof d.averageFan === 'number' && d.averageFan > 0) parts.push(`平均${d.averageFan.toFixed(1)}番`);
  if (typeof d.maxFanPotential === 'number' && d.maxFanPotential > 0) parts.push(`最高${d.maxFanPotential}番`);
  if (d.reasons && d.reasons.length > 0) parts.push(`原因：${d.reasons.join('；')}`);
  return parts.join(' / ');
}

const SYSTEM_PROMPT = `你是一位资深的四川麻将（血战到底）教练。任务是用通俗易懂、亲切自然的中文，给玩家解释一个具体局面的判断。

四川麻将规则要点：
- 只用万(m)、条(s)、筒(p)三门牌，每种 1-9 各 4 张，共 108 张
- 必须缺一门（定缺），胡牌时手中必须只有两门花色
- 不能吃，可以碰、杠（明杠/暗杠）
- 番种：大对子(1番)、清一色(2番)、七对(2番)、龙七对(3番)、金钩钓(2番)、海底捞月(1番)等
- "根"：手中或副露中有 4 张相同的牌（暗杠或明杠或刻+1），加 1 番（或加底）

输出风格要求：
- 用中文，分点说明，每点不超过 2 句话
- 总长度控制在 200-350 字
- 直接讲道理，不要客套话，不要重复题目
- 如果是"为什么用户的选择不好"，先肯定一下用户的思路再指出更优解；语气友好不要打击
- 如果是"为什么推荐这张"，从下叫速度、番数潜力、根/暗刻保留三个维度讲清楚`;

function buildUserPromptMain(b: ExplainBody): string {
  const lines: string[] = [];
  lines.push('【局面】');
  lines.push(`手牌：${tilesToText(b.handCodes)}`);
  if (b.melds && b.melds.length > 0) lines.push(`已碰/杠：${meldsToText(b.melds)}`);
  if (b.visibleCodes && b.visibleCodes.length > 0) {
    lines.push(`已见的牌：${tilesToText(b.visibleCodes)}`);
  }
  if (b.genMode) lines.push(`计分方式：${b.genMode === 'fan' ? '加番' : '加底'}`);
  lines.push('');
  lines.push('【算法给出的推荐排序】');
  if (b.recommendedDiscards && b.recommendedDiscards.length > 0) {
    b.recommendedDiscards.slice(0, 5).forEach((d, i) => {
      lines.push(`${i + 1}. 打 ${discardToText(d)}`);
    });
  }
  lines.push('');
  lines.push('【任务】');
  lines.push('请用 200-350 字向玩家解释：为什么排第一的这一张是最佳选择？分点写：');
  lines.push('1) 它在"下叫速度"上的优势（能多快胡牌）；');
  lines.push('2) 它在"番数潜力"上的考量（保留了什么、放弃了什么）；');
  lines.push('3) 与第二名相比的关键差距，让玩家明白为什么不选第二名。');
  return lines.join('\n');
}

function buildUserPromptTenpai(b: ExplainBody): string {
  const lines: string[] = [];
  lines.push('【局面】');
  lines.push(`手牌（已下叫）：${tilesToText(b.handCodes)}`);
  if (b.melds && b.melds.length > 0) lines.push(`已碰/杠：${meldsToText(b.melds)}`);
  if (b.waitingTiles && b.waitingTiles.length > 0) {
    const ws = b.waitingTiles
      .map(w => `${tileToText(w.code)}(剩${w.remaining}张${w.fan !== undefined ? `,${w.fan}番` : ''})`)
      .join('、');
    lines.push(`听牌：${ws}`);
  }
  lines.push('');
  lines.push('【任务】');
  lines.push('请用 200-300 字向玩家解释：这副听牌的好坏，听的牌好不好胡（剩多少张、是不是好叫）、番数怎样、有没有可以更好的方向。');
  return lines.join('\n');
}

function buildUserPromptQuiz(b: ExplainBody, withVisible: boolean): string {
  const lines: string[] = [];
  lines.push('【局面】');
  lines.push(`手牌（14 张未下叫）：${tilesToText(b.handCodes)}`);
  if (withVisible && b.visibleCodes && b.visibleCodes.length > 0) {
    lines.push(`桌上已见的牌：${tilesToText(b.visibleCodes)}`);
  }
  lines.push('');
  lines.push(`【玩家的选择】打 ${tileToText(b.userChoice ?? '')}`);
  lines.push('');
  lines.push('【算法给出的最佳排序】');
  if (b.bestDiscards && b.bestDiscards.length > 0) {
    b.bestDiscards.slice(0, 4).forEach((d, i) => {
      lines.push(`${i + 1}. 打 ${discardToText(d)}`);
    });
  }
  lines.push('');
  lines.push('【任务】');
  lines.push(`玩家选择了打 ${tileToText(b.userChoice ?? '')}，但算法推荐的更好。请用 200-350 字、口吻友好地讲清楚，必须分成两部分对比写：`);
  lines.push('');
  lines.push('第一部分：为什么玩家选择的这张不够好');
  lines.push('- 先简要肯定玩家可能的思路');
  lines.push('- 再指出具体问题：向听数变高？有效进张少？拆了根或暗刻？番数潜力下降？');
  lines.push('- 结合上方给出的"进张明细"具体牌张来分析，不要只报数字');
  lines.push('');
  lines.push('第二部分：为什么排名第一的牌更好');
  lines.push('- 具体好在哪：下叫速度更快？听的牌更多？保留了根/暗刻？');
  lines.push('- 同样结合"进张明细"来对比说明，让读者直观感受到差距');
  lines.push('- 最后给一句总结：以后遇到类似牌型可以怎样想');
  return lines.join('\n');
}

export async function POST(req: NextRequest): Promise<NextResponse<ExplainResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: '服务器未配置 ANTHROPIC_API_KEY' },
      { status: 500 }
    );
  }

  let body: ExplainBody;
  try {
    body = (await req.json()) as ExplainBody;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体解析失败' }, { status: 400 });
  }

  if (!body.handCodes || body.handCodes.length === 0) {
    return NextResponse.json({ ok: false, error: '缺少手牌' }, { status: 400 });
  }

  let userPrompt: string;
  if (body.mode === 'mainTenpai') {
    userPrompt = buildUserPromptTenpai(body);
  } else if (body.mode === 'quizT2') {
    userPrompt = buildUserPromptQuiz(body, false);
  } else if (body.mode === 'quizT3') {
    userPrompt = buildUserPromptQuiz(body, true);
  } else {
    userPrompt = buildUserPromptMain(body);
  }

  const baseURL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim().replace(/\/+$/, '');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  // 与 /api/recognize 保持一致：不使用 system 顶层字段，避免部分中转代理 422
  const requestBody = {
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${SYSTEM_PROMPT}\n\n${userPrompt}`
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
      console.error('[explain] upstream error', upstream.status, text.slice(0, 500));
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
      return NextResponse.json({ ok: false, error: '解释返回为空' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, explanation: String(textBlock.text).trim() });
  } catch (err: any) {
    console.error('[explain] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? '解释服务异常' },
      { status: 500 }
    );
  }
}
