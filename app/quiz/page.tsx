'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MJTile } from '@/components/MJTile';
import { TilePicker } from '@/components/TilePicker';
import {
  getRank,
  loadRecord,
  addScore,
  resetRecord,
  scoreT1,
  scoreT2OrT3,
  RANKS,
  ScoreRecord
} from '@/lib/mahjong/score';

type QuizType = 't1' | 't2' | 't3' | 't5';

interface T1Quiz { type: 't1'; handCodes: string[]; waitingTiles: { code: string; remaining: number }[] }
interface T2Quiz {
  type: 't2';
  handCodes: string[];
  bestDiscards: { code: string; rank: number; effectiveCount: number; expectedScore?: number; reasons?: string[] }[];
  algorithm?: 'expectedScore';
}
interface T3Quiz extends Omit<T2Quiz, 'type'> { type: 't3'; visibleCodes: string[] }
type Quiz = T1Quiz | T2Quiz | T3Quiz;

export default function QuizPage() {
  const [record, setRecord] = useState<ScoreRecord>({ total: 0, testsCompleted: 0, history: [], updatedAt: 0 });
  const [tab, setTab] = useState<QuizType>('t1');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answerSet, setAnswerSet] = useState<Set<string>>(new Set()); // T1
  const [answerOne, setAnswerOne] = useState<string | null>(null); // T2/T3
  const [submitted, setSubmitted] = useState<{ delta: number; correct?: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRecord(loadRecord());
  }, []);

  const rank = useMemo(() => getRank(record.total), [record.total]);

  const fetchQuiz = async (t: QuizType) => {
    if (t === 't5') return; // 待开发
    setLoading(true);
    setSubmitted(null);
    setAnswerSet(new Set());
    setAnswerOne(null);
    try {
      const res = await fetch(`/api/quiz?type=${t}`);
      const data = await res.json();
      if (data.ok) setQuiz(data as Quiz);
    } finally {
      setLoading(false);
    }
  };

  const handleTab = (t: QuizType) => {
    setTab(t);
    if (t !== 't5') fetchQuiz(t);
    else {
      setQuiz(null);
      setSubmitted(null);
    }
  };

  useEffect(() => {
    fetchQuiz('t1');
  }, []);

  const handleSubmit = () => {
    if (!quiz || submitted) return;
    let delta = 0;
    if (quiz.type === 't1') {
      const correct = quiz.waitingTiles.map(w => w.code);
      delta = scoreT1(Array.from(answerSet), correct);
      const r = addScore('t1', delta);
      setRecord(r);
      setSubmitted({ delta, correct });
    } else {
      if (!answerOne) return;
      const top = (quiz as T2Quiz).bestDiscards;
      delta = scoreT2OrT3(answerOne, top);
      const r = addScore(quiz.type as 't2' | 't3', delta);
      setRecord(r);
      setSubmitted({ delta, correct: top });
    }
  };

  const handleReset = () => {
    if (!confirm('确定要清空所有分数和段位吗？')) return;
    setRecord(resetRecord());
  };

  const sortHand = (codes: string[]) =>
    [...codes].sort((a, b) => {
      const sa = 'msp'.indexOf(a[1]); const sb = 'msp'.indexOf(b[1]);
      if (sa !== sb) return sa - sb;
      return parseInt(a[0]) - parseInt(b[0]);
    });

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-baseline">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-sage-800">🎯 测试水平</h1>
          <p className="text-sm text-sage-600 mt-1">练习听牌、出牌、看局判断 · 累积分数升段</p>
        </div>
        <Link href="/" className="text-sm text-sage-600 hover:text-sage-800">← 返回主页</Link>
      </div>

      {/* 当前段位卡片 */}
      <section className="glass-card p-4 md:p-5 mt-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-soft"
            style={{ background: rank.color }}
          >
            {rank.name[0]}
          </div>
          <div>
            <div className="text-lg font-semibold text-sage-800">{rank.name}</div>
            <div className="text-xs text-sage-600">
              当前 <b>{record.total.toFixed(1)}</b> 分 · 已完成 {record.testsCompleted} 次
              {rank.nextAt && (
                <span className="ml-1">· 距下一段 {(rank.nextAt - record.total).toFixed(1)} 分</span>
              )}
            </div>
            <div className="progress-track mt-1.5 w-48">
              <div
                className="progress-fill"
                style={{
                  width: rank.nextAt
                    ? `${Math.min(100, ((record.total - RANKS[rank.index].min) / (rank.nextAt - RANKS[rank.index].min)) * 100)}%`
                    : '100%'
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANKS.map((r, i) => (
            <span
              key={r.name}
              className="pill text-xs"
              style={{
                background: i === rank.index ? r.color : '#f4faf5',
                color: i === rank.index ? 'white' : '#346a3f',
                border: `1px solid ${i === rank.index ? r.color : '#cbe7d0'}`
              }}
              title={`${r.name}：${r.min}–${r.max === Infinity ? '∞' : r.max} 分`}
            >
              {r.name}
            </span>
          ))}
        </div>
        <button onClick={handleReset} className="btn-ghost text-xs">重置分数</button>
      </section>

      {/* 题型 Tabs */}
      <section className="mt-5">
        <div className="flex flex-wrap gap-2">
          {[
            { k: 't1', label: 'T1 · 听几门牌' },
            { k: 't2', label: 'T2 · 打哪张牌' },
            { k: 't3', label: 'T3 · 看局打牌' },
            { k: 't5', label: 'T5 · 安全牌（待开发）' }
          ].map(it => (
            <button
              key={it.k}
              onClick={() => handleTab(it.k as QuizType)}
              disabled={it.k === 't5'}
              className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                tab === it.k
                  ? 'bg-sage-500 text-white border-sage-500'
                  : 'bg-white text-sage-700 border-sage-200 hover:bg-sage-50'
              } ${it.k === 't5' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </section>

      {/* 题面 */}
      {tab === 't5' ? (
        <section className="glass-card p-8 mt-5 text-center text-sage-600">
          <div className="text-4xl mb-2">🔒</div>
          <div className="text-base font-medium text-sage-700">安全牌测试 · 待开发</div>
          <div className="text-xs text-sage-500 mt-2">
            目前算法不考虑防守。后续会加入"上家最近打的几张 → 哪张最安全"题型
          </div>
        </section>
      ) : (
        <section className="glass-card p-5 md:p-6 mt-5">
          {loading && <div className="text-sage-600 text-sm">加载题目中…</div>}
          {!loading && quiz && (
            <>
              <QuizPrompt type={quiz.type} />

              {quiz.type === 't3' && (
                <div className="mb-3">
                  <div className="text-xs text-sage-600 mb-1">桌面已可见的牌（{(quiz as T3Quiz).visibleCodes.length} 张）</div>
                  <div className="flex flex-wrap gap-1">
                    {sortHand((quiz as T3Quiz).visibleCodes).map((c, i) => (
                      <MJTile key={i} code={c} size="sm" dim />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="text-xs text-sage-600 mb-1">你的手牌（{quiz.handCodes.length} 张）</div>
                <div className="flex flex-wrap gap-1.5">
                  {sortHand(quiz.handCodes).map((c, i) => {
                    if (quiz.type === 't1') {
                      return <MJTile key={i} code={c} size="md" />;
                    }
                    const selected = answerOne === c;
                    return (
                      <MJTile
                        key={i}
                        code={c}
                        size="md"
                        highlight={selected}
                        onClick={() => !submitted && setAnswerOne(c)}
                      />
                    );
                  })}
                </div>
              </div>

              {quiz.type === 't1' && (
                <div className="mt-4">
                  <div className="text-xs text-sage-600 mb-1">点选你认为能胡的牌（多选）：</div>
                  <div className="space-y-1.5">
                    {(['m', 's', 'p'] as const).map(suit => (
                      <div key={suit} className="flex items-center gap-2">
                        <span className="label-tag w-10 justify-center text-xs">
                          {suit === 'm' ? '万' : suit === 's' ? '条' : '筒'}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[1,2,3,4,5,6,7,8,9].map(r => {
                            const c = `${r}${suit}`;
                            const sel = answerSet.has(c);
                            return (
                              <MJTile
                                key={c}
                                code={c}
                                size="sm"
                                highlight={sel}
                                dim={!sel}
                                onClick={() => {
                                  if (submitted) return;
                                  const ns = new Set(answerSet);
                                  if (ns.has(c)) ns.delete(c); else ns.add(c);
                                  setAnswerSet(ns);
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 提交 / 下一题 */}
              <div className="mt-5 flex gap-3 flex-wrap items-center">
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={
                      (quiz.type === 't1' && answerSet.size === 0) ||
                      (quiz.type !== 't1' && !answerOne)
                    }
                    className="btn-primary"
                  >提交答案</button>
                ) : (
                  <>
                    <div className={`pill text-base px-4 py-2 ${
                      submitted.delta > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : submitted.delta < 0 ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-sage-100 text-sage-700 border border-sage-300'
                    }`}>
                      {submitted.delta > 0 ? `+${submitted.delta} 分` : `${submitted.delta} 分`}
                    </div>
                    <button onClick={() => fetchQuiz(quiz.type as QuizType)} className="btn-primary">下一题 →</button>
                  </>
                )}
              </div>

              {/* 答案揭示 */}
              {submitted && (
                <div className="mt-4 p-4 rounded-xl bg-sage-50 border border-sage-200">
                  <div className="text-sm font-semibold text-sage-700 mb-2">📖 正确答案</div>
                  {quiz.type === 't1' ? (
                    <div className="flex flex-wrap gap-2">
                      {(quiz as T1Quiz).waitingTiles.map(w => (
                        <div key={w.code} className="flex flex-col items-center">
                          <MJTile code={w.code} highlight />
                          <div className="text-xs text-sage-600 mt-1">剩 {w.remaining}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-xs text-emerald-700 mb-1">
                        ⚙️ 使用算法：<b>综合推荐（下叫速度 + 考量番数）</b> · 同时考虑听张数、胡牌概率、保留根/暗刻、七对/清一色潜力
                      </div>
                      {(quiz as T2Quiz).bestDiscards.map(d => (
                        <div key={d.code} className="border border-sage-100 rounded-lg p-2 bg-white/70">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="pill bg-white border border-sage-200">#{d.rank}</span>
                            <MJTile code={d.code} size="sm" highlight={d.rank === 1} />
                            <span className="text-xs text-sage-600">有效进张 {d.effectiveCount} 张</span>
                            {typeof d.expectedScore === 'number' && (
                              <span className="pill bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                                综合 {d.expectedScore.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {d.reasons && d.reasons.length > 0 && (
                            <ul className="mt-1 text-xs text-sage-600 space-y-0.5 pl-1">
                              {d.reasons.map((r, i) => (
                                <li key={i}>· {r}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-sage-500 hover:text-sage-700">← 返回川麻小助手</Link>
      </div>
    </main>
  );
}

function QuizPrompt({ type }: { type: QuizType }) {
  const map: Record<string, string> = {
    t1: '🀄 这副 13 张手牌已下叫。请点选你认为能胡的所有牌。',
    t2: '🀄 这副 14 张手牌还未下叫。请选择最该打出去的那一张。',
    t3: '🀄 桌上已经打出过下面这些牌。结合手牌，请选择最该打出去的那一张。'
  };
  return <div className="text-sm text-sage-700 mb-3">{map[type]}</div>;
}
