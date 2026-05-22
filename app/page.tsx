'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { MJTile } from '@/components/MJTile';
import { TilePicker } from '@/components/TilePicker';

type Phase = 'win' | 'tenpai' | 'noten';

interface DiscardSuggestion {
  discard: number;
  discardCode: string;
  actionType?: 'discard' | 'concealedKong';
  shantenAfter: number;
  effectiveTiles: { index: number; code: string; remaining: number }[];
  effectiveCount: number;
  probability?: number;
  expectedScore?: number;
  speedScore?: number;
  valueScore?: number;
  winProbability?: number;
  averageFan?: number;
  maxFanPotential?: number;
  fanDistribution?: { fan: number; count: number }[];
  lostGen?: number;
  preservedGen?: number;
  lostTriplets?: number;
  preservedTriplets?: number;
  sevenPairsPotential?: number;
  longSevenPairsPotential?: number;
  allPungsPotential?: number;
  pureSuitPotential?: number;
  riskPenalty?: number;
  reasons?: string[];
}

interface AnalysisResult {
  phase: Phase;
  shanten: { shanten: number; type: string; needDropSuit?: string };
  isWin: boolean;
  waitingTiles?: { index: number; code: string; remaining: number; winType: string; fan?: number }[];
  suggestedDiscards?: DiscardSuggestion[];
  evSuggestions?: DiscardSuggestion[];
  speedSuggestions?: DiscardSuggestion[];
  objective?: 'expectedScore' | 'speed';
  warnings: string[];
  handSummary: string;
  remainingPoolHint?: { code: string; remaining: number }[];
  fan?: { fans: { name: string; value: number }[]; totalFan: number; extraDi: number; description: string };
  settlement?: { perPlayer: number; detail: string };
}

const ALL_CODES: string[] = (() => {
  const out: string[] = [];
  for (const s of ['m', 's', 'p'] as const) {
    for (let r = 1; r <= 9; r++) out.push(`${r}${s}`);
  }
  return out;
})();

export default function Home() {
  const [hand, setHand] = useState<string[]>([]);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [melds, setMelds] = useState<{ type: 'pung' | 'kong'; tile: string }[]>([]);
  const [genMode, setGenMode] = useState<'fan' | 'di'>('fan');
  const [isHaidi, setIsHaidi] = useState(false);
  const [isAfterKong, setIsAfterKong] = useState(false);
  const [isKongDischarge, setIsKongDischarge] = useState(false);
  const [isRobKong, setIsRobKong] = useState(false);
  const [baseScore, setBaseScore] = useState(1);
  const [fanCap, setFanCap] = useState(4);
  const [recognizing, setRecognizing] = useState(false);
  const [showMeldEditor, setShowMeldEditor] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recognizeNote, setRecognizeNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVisibleEditor, setShowVisibleEditor] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedHand = useMemo(() => {
    return [...hand].sort((a, b) => {
      const sa = 'msp'.indexOf(a[1]);
      const sb = 'msp'.indexOf(b[1]);
      if (sa !== sb) return sa - sb;
      return parseInt(a[0]) - parseInt(b[0]);
    });
  }, [hand]);

  const handCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of hand) m[c] = (m[c] ?? 0) + 1;
    return m;
  }, [hand]);

  const handleAddTile = (code: string) => {
    if (hand.length >= 14) {
      setError('手牌最多 14 张');
      return;
    }
    if ((handCounts[code] ?? 0) >= 4) {
      setError(`${code} 已经 4 张`);
      return;
    }
    setError(null);
    setHand([...hand, code]);
  };

  const handleRemoveTile = (idx: number) => {
    const next = hand.slice();
    next.splice(idx, 1);
    setHand(next);
  };

  const handleClear = () => {
    setHand([]);
    setResult(null);
    setError(null);
  };

  const handleVisibleChange = (code: string, delta: number) => {
    setVisible(prev => {
      const next = { ...prev };
      const cur = next[code] ?? 0;
      const used = (handCounts[code] ?? 0) + cur;
      if (delta > 0 && used >= 4) return next;
      const v = Math.max(0, cur + delta);
      if (v === 0) delete next[code];
      else next[code] = v;
      return next;
    });
  };

  const handlePhotoUpload = async (file: File) => {
    setError(null);
    setRecognizeNote(null);
    setRecognizing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? '识别失败');
      } else {
        const tiles: string[] = (data.tiles ?? []).slice(0, 14);
        setHand(tiles);
        if (data.notes) setRecognizeNote(data.notes);
        if (typeof data.confidence === 'number') {
          setRecognizeNote(prev =>
            (prev ? prev + ' ' : '') + `（置信度 ${(data.confidence * 100).toFixed(0)}%）`
          );
        }
      }
    } catch (e: any) {
      setError(e?.message ?? '识别请求失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleAnalyze = async () => {
    if (hand.length === 0) {
      setError('请先输入或拍照识别手牌');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const visibleCodes: string[] = [];
      for (const [k, v] of Object.entries(visible)) {
        for (let i = 0; i < v; i++) visibleCodes.push(k);
      }
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handCodes: hand,
          visibleCodes,
          melds,
          genMode,
          isHaidi,
          isAfterKong,
          isKongDischarge,
          isRobKong,
          baseScore,
          fanCap,
          objective: 'expectedScore'
        })
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? '分析失败');
      } else {
        setResult(data.result);
      }
    } catch (e: any) {
      setError(e?.message ?? '分析请求失败');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 max-w-5xl mx-auto">
      <Header />

      {/* 第 1 步：拍照 / 手动输入 */}
      <section className="glass-card p-5 md:p-6 mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-sage-800">① 输入手牌</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={recognizing}
              className="btn-primary"
            >
              {recognizing ? '识别中…' : '📷 拍照识牌'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button onClick={handleClear} className="btn-ghost">清空</button>
          </div>
        </div>

        {recognizeNote && (
          <div className="mb-3 text-xs text-sage-700 bg-sage-50 border border-sage-200 rounded-lg px-3 py-2">
            🌿 {recognizeNote}
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs text-sage-600 mb-2">
            当前 <b>{hand.length}</b> 张{hand.length === 13 && '（已下叫候选）'}
            {hand.length === 14 && '（待出牌候选）'}
          </div>
          <div className="min-h-[68px] p-3 rounded-xl bg-cream border border-sage-100 flex flex-wrap gap-1.5 items-center">
            {sortedHand.length === 0 ? (
              <span className="text-sage-400 text-sm">尚未输入手牌，可拍照或下方选牌</span>
            ) : (
              sortedHand.map((c, i) => (
                <MJTile
                  key={`${c}-${i}`}
                  code={c}
                  removable
                  onClick={() => handleRemoveTile(hand.indexOf(c))}
                />
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-sage-600 flex-wrap">
            <button
              onClick={() => setShowMeldEditor(!showMeldEditor)}
              className="px-2 py-0.5 rounded bg-sage-100 hover:bg-sage-200 text-sage-700"
            >
              已碰/杠：{melds.length} 副 {showMeldEditor ? '▲' : '▼'}
            </button>
            {melds.map((m, i) => (
              <span key={i} className="pill bg-white border border-sage-200">
                {m.type === 'kong' ? '杠' : '碰'} {m.tile[0]}
                {({ m: '万', s: '条', p: '筒' } as any)[m.tile[1]]}
                <button
                  onClick={() => setMelds(melds.filter((_, j) => j !== i))}
                  className="ml-1 text-red-500"
                >×</button>
              </span>
            ))}
            <span className="text-sage-400">碰=刻子（同点 3 张），杠=4 张</span>
          </div>
          {showMeldEditor && (
            <div className="mt-3 p-3 rounded-lg bg-sage-50 border border-sage-100">
              <div className="text-xs text-sage-700 mb-2">添加一副：先点类型，再点哪张牌</div>
              <MeldAdder
                onAdd={(type, tile) => {
                  if (melds.length >= 4) return;
                  setMelds([...melds, { type, tile }]);
                  setShowMeldEditor(false);
                }}
              />
            </div>
          )}
        </div>

        <TilePicker onPick={handleAddTile} title="点击下方牌以加入手牌" />
      </section>

      {/* 第 2 步：剩余可见牌（二次分析输入） */}
      <section className="glass-card p-5 md:p-6 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-sage-800">② 已知打出/可见的牌</h2>
          <button
            onClick={() => setShowVisibleEditor(!showVisibleEditor)}
            className="btn-ghost text-xs"
          >
            {showVisibleEditor ? '收起' : '展开编辑'}
          </button>
        </div>
        <p className="text-xs text-sage-600 mb-3">
          告诉我场上某张牌还能见到几张（如 5 万对家打了 1 张、自己摸到 0 张），用于更准确估算有效进张概率。
        </p>

        {Object.keys(visible).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(visible).map(([code, n]) => (
              <MJTile key={code} code={code} size="sm" badge={`已见${n}`} />
            ))}
          </div>
        )}

        {showVisibleEditor && (
          <div className="space-y-2">
            {(['m', 's', 'p'] as const).map(suit => (
              <div key={suit} className="flex items-center gap-2">
                <span className="label-tag w-12 justify-center">
                  {suit === 'm' ? '万' : suit === 's' ? '条' : '筒'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CODES.filter(c => c[1] === suit).map(c => {
                    const v = visible[c] ?? 0;
                    const usedTotal = (handCounts[c] ?? 0) + v;
                    return (
                      <div key={c} className="flex flex-col items-center">
                        <MJTile code={c} size="sm" dim={v === 0} />
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleVisibleChange(c, -1)}
                            className="text-xs w-5 h-5 rounded bg-sage-100 hover:bg-sage-200"
                          >−</button>
                          <span className="text-xs w-4 text-center">{v}</span>
                          <button
                            onClick={() => handleVisibleChange(c, 1)}
                            disabled={usedTotal >= 4}
                            className="text-xs w-5 h-5 rounded bg-sage-100 hover:bg-sage-200 disabled:opacity-30"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 开局助手：定缺 / 换三张 / 碰决策 */}
      <OpeningAssistant hand={hand} melds={melds} visible={visible} />

      {/* 第 3 步：结算设置 + 分析 */}
      <section className="glass-card p-5 md:p-6 mt-6">
        <h2 className="text-lg font-semibold text-sage-800 mb-3">③ 结算设置</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-sage-700 mr-2">根：</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-sage-300">
              <button
                onClick={() => setGenMode('fan')}
                className={`px-3 py-1.5 ${genMode === 'fan' ? 'bg-sage-500 text-white' : 'bg-white text-sage-700'}`}
              >加番</button>
              <button
                onClick={() => setGenMode('di')}
                className={`px-3 py-1.5 ${genMode === 'di' ? 'bg-sage-500 text-white' : 'bg-white text-sage-700'}`}
              >加底</button>
            </div>
          </div>
          <label className="flex items-center gap-1 text-sage-700">
            <input
              type="checkbox"
              checked={isHaidi}
              onChange={e => setIsHaidi(e.target.checked)}
              className="accent-sage-500"
            />
            海底捞月
          </label>
          <label className="flex items-center gap-1 text-sage-700">
            <input
              type="checkbox"
              checked={isAfterKong}
              onChange={e => setIsAfterKong(e.target.checked)}
              className="accent-sage-500"
            />
            杠上花 (+2 番)
          </label>
          <label className="flex items-center gap-1 text-sage-700">
            <input
              type="checkbox"
              checked={isKongDischarge}
              onChange={e => setIsKongDischarge(e.target.checked)}
              className="accent-sage-500"
            />
            杠上炮 (+1 番)
          </label>
          <label className="flex items-center gap-1 text-sage-700">
            <input
              type="checkbox"
              checked={isRobKong}
              onChange={e => setIsRobKong(e.target.checked)}
              className="accent-sage-500"
            />
            抢杠胡 (+1 番)
          </label>
          <label className="flex items-center gap-1 text-sage-700">
            底分
            <input
              type="number"
              value={baseScore}
              min={1}
              onChange={e => setBaseScore(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border border-sage-200 rounded bg-white"
            />
          </label>
          <label className="flex items-center gap-1 text-sage-700">
            番数封顶
            <select
              value={fanCap}
              onChange={e => setFanCap(parseInt(e.target.value))}
              className="px-2 py-1 border border-sage-200 rounded bg-white"
            >
              {[3, 4, 5, 6, 99].map(n => (
                <option key={n} value={n}>{n === 99 ? '不封顶' : `${n} 番`}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 text-xs text-sage-600">
          番种参考：大对子 1 番 · 清一色 2 番 · 七对 2 番 · 龙七对 3 番 · 金钩钓 2 番 · 海底捞月 1 番
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary text-base px-6 py-3">
            {analyzing ? '分析中…' : '🍀 开始分析'}
          </button>
        </div>
      </section>

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <ResultPanel
          result={result}
          totalUnseen={Math.max(
            1,
            108 - hand.length -
              Object.values(visible).reduce((a, b) => a + b, 0) -
              melds.reduce((s, m) => s + (m.type === 'kong' ? 4 : 3), 0)
          )}
        />
      )}

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="text-center pt-4 relative">
      <div className="inline-flex items-center gap-2 mb-2">
        <span className="text-3xl">🀄</span>
        <h1 className="text-2xl md:text-3xl font-bold text-sage-800">川麻小助手</h1>
      </div>
      <p className="text-sm text-sage-600">四川麻将（血战到底）听牌 · 出牌 · 进张分析</p>
      <a
        href="/quiz"
        className="absolute right-0 top-2 px-5 py-2.5 rounded-2xl bg-sage-500 text-white text-base font-semibold shadow-soft hover:bg-sage-600 active:bg-sage-700 transition"
      >
        🎯 测试水平
      </a>
    </header>
  );
}

function Footer() {
  const [showQR, setShowQR] = useState(false);
  return (
    <footer className="mt-10 text-center pb-6">
      <div className="text-xs text-sage-500">仅供学习和娱乐参考 — 不考虑防守的算法</div>
      <div className="text-xs text-sage-500 mt-1">by: CRQS</div>
      <button
        onClick={() => setShowQR(!showQR)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-sage-600 hover:text-sage-800 underline-offset-2 hover:underline"
      >
        🍵 如果你觉得好用的话点此打赏作者{showQR ? '（点击收起）' : ''}
      </button>
      {showQR && (
        <div className="mt-3 inline-block p-3 rounded-2xl bg-white border border-sage-200 shadow-soft">
          <img
            src="/donate-qr.png"
            alt="打赏二维码"
            style={{ width: 200, height: 'auto', display: 'block' }}
          />
          <div className="text-xs text-sage-500 mt-2">谢谢支持 ☕</div>
        </div>
      )}
      <div className="mt-4 text-xs text-sage-600">
        反馈 bug / 商务合作 联系邮箱：
        <a
          href="mailto:1507971639@qq.com"
          className="ml-1 text-sage-700 hover:text-sage-900 underline underline-offset-2"
        >
          1507971639@qq.com
        </a>
      </div>
    </footer>
  );
}

function ResultPanel({ result, totalUnseen }: { result: AnalysisResult; totalUnseen: number }) {
  const phaseConfig = {
    win: { label: '胡牌！🎉', color: 'bg-green-100 text-green-800 border-green-300' },
    tenpai: { label: '已下叫', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    noten: { label: '尚未下叫', color: 'bg-amber-50 text-amber-800 border-amber-300' }
  } as const;

  const cfg = phaseConfig[result.phase];
  const totalEffective = result.suggestedDiscards?.[0]?.effectiveCount ?? 0;

  return (
    <section className="glass-card p-5 md:p-6 mt-6 space-y-4">
      <div className="flex items-baseline flex-wrap gap-3">
        <span className={`pill border ${cfg.color}`}>{cfg.label}</span>
        <span className="text-sm text-sage-700">
          向听数：<b>{result.shanten.shanten}</b>
          {result.shanten.shanten === -1 && '（已胡）'}
          {result.shanten.shanten === 0 && '（听牌）'}
          {result.shanten.shanten >= 1 && '（距听牌还差）'}
        </span>
        {result.shanten.needDropSuit && (
          <span className="pill bg-amber-50 text-amber-700 border border-amber-200">
            建议舍弃：{({ m: '万', s: '条', p: '筒' } as any)[result.shanten.needDropSuit]} 门
          </span>
        )}
        <span className="text-xs text-sage-500">手牌：{result.handSummary}</span>
      </div>

      {result.warnings.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
          {result.warnings.map((w, i) => <div key={i}>※ {w}</div>)}
        </div>
      )}

      {/* 胡牌：恭喜 + 番数 */}
      {result.phase === 'win' && (
        <div className="text-center py-4">
          <div className="text-5xl mb-2">🎊</div>
          <div className="text-lg text-sage-800 font-semibold">这副牌已经胡了！</div>
          {result.fan && (
            <div className="mt-3 inline-block text-left bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {result.fan.fans.length === 0 ? (
                  <span className="text-sage-600 text-sm">无番（鸡胡）</span>
                ) : (
                  result.fan.fans.map((f, i) => (
                    <span key={i} className="pill bg-white text-sage-700 border border-sage-200">
                      {f.name} {f.value > 0 && `+${f.value}`}
                    </span>
                  ))
                )}
              </div>
              <div className="mt-2 text-sm text-sage-700 text-center">
                合计 <b className="text-sage-800 text-lg">{result.fan.totalFan}</b> 番
                {result.fan.extraDi > 0 && <span className="ml-1">+ {result.fan.extraDi} 加底</span>}
              </div>
              {result.settlement && (
                <div className="mt-1 text-xs text-sage-500 text-center">
                  💰 每家应付 <b className="text-sage-700">{result.settlement.perPlayer}</b>（{result.settlement.detail}）
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 听牌：列出胡哪几张 */}
      {result.phase === 'tenpai' && result.waitingTiles && (() => {
        const totalRem = result.waitingTiles.reduce((s, t) => s + t.remaining, 0);
        return (
          <div>
            <h3 className="text-sm font-semibold text-sage-700 mb-2">
              可胡 {result.waitingTiles.length} 种 · 共 {totalRem} 张 ·
              <span className="text-emerald-700 ml-1">摸到胡牌概率 {(totalRem / totalUnseen * 100).toFixed(1)}%</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.waitingTiles
                .slice()
                .sort((a, b) => b.remaining - a.remaining)
                .map(w => (
                  <div key={w.code} className="flex flex-col items-center">
                    <MJTile code={w.code} highlight />
                    <div className="text-xs text-sage-600 mt-1">
                      剩 <b>{w.remaining}</b>
                      <span className="ml-1 text-emerald-700">{(w.remaining / totalUnseen * 100).toFixed(1)}%</span>
                      {w.fan !== undefined && (
                        <span className="ml-1 text-sage-700">· {w.fan}番</span>
                      )}
                      {w.winType === 'chitoitsu' && (
                        <span className="ml-1 text-emerald-600">·七对</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })()}

      {/* 14 张未听：出牌建议（主推荐 = EV，次要 = 速度优先） */}
      {result.phase !== 'win' && result.suggestedDiscards && result.suggestedDiscards.length > 0 && result.suggestedDiscards[0].discard >= 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
            <h3 className="text-sm font-semibold text-sage-700">
              出牌建议 · Top {Math.min(result.suggestedDiscards.length, 6)}
            </h3>
            <span className="pill bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
              综合推荐（下叫速度 + 考量番数）
            </span>
          </div>
          <p className="text-xs text-sage-500 mb-2">
            综合考虑两个维度：<span className="text-sky-700">下叫速度</span>（多快能下叫/胡牌）+ <span className="text-violet-700">考量番数</span>（番数潜力、保留根和暗刻）。两者相加得到"综合"分。
          </p>
          <div className="space-y-2">
            {result.suggestedDiscards.slice(0, 6).map((s, i) => (
              <DiscardRow key={`ev-${s.discardCode}`} suggestion={s} rank={i + 1} bestEffective={totalEffective} mode="ev" />
            ))}
          </div>

          {/* 速度优先备选方案（如果与主推不同） */}
          {result.speedSuggestions && result.speedSuggestions.length > 0 && (() => {
            const speedTop = result.speedSuggestions[0];
            const evTop = result.suggestedDiscards![0];
            if (speedTop.discardCode === evTop.discardCode) return null;
            return (
              <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                  ⚡ 速度优先方案（最快下叫算法结果，仅供对比）
                </summary>
                <p className="text-xs text-amber-800 mt-2">
                  此方案只看"打后向听数 + 进张数"，不考虑根/番数/EV。下面是该算法的 Top 3：
                </p>
                <div className="space-y-2 mt-2">
                  {result.speedSuggestions.slice(0, 3).map((s, i) => (
                    <DiscardRow key={`speed-${s.discardCode}`} suggestion={s} rank={i + 1} bestEffective={result.speedSuggestions![0].effectiveCount} mode="speed" />
                  ))}
                </div>
              </details>
            );
          })()}
        </div>
      )}

      {/* 13 张未听：进张提示 */}
      {result.phase === 'noten' && result.suggestedDiscards && result.suggestedDiscards[0]?.discard === -1 && (
        <div>
          <h3 className="text-sm font-semibold text-sage-700 mb-2">
            有效进张 · 摸到这些牌可以推进
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.suggestedDiscards[0].effectiveTiles.map(t => (
              <div key={t.code} className="flex flex-col items-center">
                <MJTile code={t.code} highlight={t.remaining > 0} dim={t.remaining === 0} />
                <div className="text-xs text-sage-600 mt-1">剩 {t.remaining}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键牌剩余 */}
      {result.remainingPoolHint && result.remainingPoolHint.length > 0 && (
        <details className="text-xs text-sage-600">
          <summary className="cursor-pointer">关键牌池剩余（已扣除手牌与可见牌）</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.remainingPoolHint.map(p => (
              <MJTile key={p.code} code={p.code} size="sm" badge={p.remaining} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function DiscardRow({
  suggestion,
  rank,
  bestEffective,
  mode = 'ev'
}: {
  suggestion: NonNullable<AnalysisResult['suggestedDiscards']>[number];
  rank: number;
  bestEffective: number;
  mode?: 'ev' | 'speed';
}) {
  const widthPct = bestEffective > 0 ? Math.round((suggestion.effectiveCount / bestEffective) * 100) : 0;
  const isEv = mode === 'ev';
  const accent = isEv
    ? (rank === 1 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
    : (rank === 1 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700');
  return (
    <div className={`border rounded-xl p-3 ${isEv ? 'border-emerald-200 bg-white/70' : 'border-amber-200 bg-white/60'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`pill ${accent}`}>#{rank}</span>
        {suggestion.actionType === 'concealedKong' ? (
          <>
            <span className="pill bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold">
              ⛓️ 暗杠
            </span>
            <MJTile code={suggestion.discardCode} size="sm" highlight={rank === 1} />
            <span className="text-xs text-sage-700">
              杠后 +1 根、不影响向听
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-sage-600">打出：</span>
            <MJTile code={suggestion.discardCode} size="sm" highlight={rank === 1} />
            <span className="text-xs text-sage-700">
              打后向听 <b>{suggestion.shantenAfter}</b> ·
              有效进张 <b>{suggestion.effectiveCount}</b> 张 / {suggestion.effectiveTiles.length} 种
              {typeof suggestion.probability === 'number' && (
                <span className="ml-1 text-emerald-700">· 摸进概率 <b>{(suggestion.probability * 100).toFixed(1)}%</b></span>
              )}
            </span>
          </>
        )}
        {isEv && typeof suggestion.expectedScore === 'number' && (
          <span className="pill bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
            综合 {suggestion.expectedScore.toFixed(2)}
          </span>
        )}
        {isEv && typeof suggestion.speedScore === 'number' && (
          <span
            className="pill bg-sky-50 text-sky-700 border border-sky-200 text-xs"
            title="下叫速度：能多快下叫 + 听张数；越高表示越快胡"
          >
            下叫速度 {suggestion.speedScore.toFixed(2)}
          </span>
        )}
        {isEv && typeof suggestion.valueScore === 'number' && (
          <span
            className="pill bg-violet-50 text-violet-700 border border-violet-200 text-xs"
            title="考量番数：保留根/暗刻、清一色/七对潜力 - 拆根/拆暗刻代价；越高胡牌时番数越大"
          >
            考量番数 {suggestion.valueScore.toFixed(2)}
          </span>
        )}
        {isEv && typeof suggestion.averageFan === 'number' && suggestion.averageFan > 0 && (
          <span className="pill bg-sage-50 text-sage-700 border border-sage-200 text-xs">
            平均 {suggestion.averageFan.toFixed(1)} 番
          </span>
        )}
        {isEv && typeof suggestion.maxFanPotential === 'number' && suggestion.maxFanPotential > 0 && (
          <span className="pill bg-sage-50 text-sage-700 border border-sage-200 text-xs">
            最高 {suggestion.maxFanPotential} 番
          </span>
        )}
        {typeof suggestion.lostGen === 'number' && suggestion.lostGen > 0 && (
          <span className="pill bg-red-50 text-red-700 border border-red-200 text-xs">
            拆根 ×{suggestion.lostGen}
          </span>
        )}
        {typeof suggestion.lostTriplets === 'number' && suggestion.lostTriplets > 0 && (
          <span className="pill bg-orange-50 text-orange-700 border border-orange-200 text-xs">
            拆暗刻 ×{suggestion.lostTriplets}
          </span>
        )}
        {typeof suggestion.preservedGen === 'number' && suggestion.preservedGen > 0 && (
          <span className="pill bg-amber-50 text-amber-700 border border-amber-200 text-xs">
            保留根 ×{suggestion.preservedGen}
          </span>
        )}
        {typeof suggestion.preservedTriplets === 'number' && suggestion.preservedTriplets > 0 && (
          <span className="pill bg-amber-50 text-amber-700 border border-amber-200 text-xs">
            保留暗刻 ×{suggestion.preservedTriplets}
          </span>
        )}
      </div>
      {suggestion.reasons && suggestion.reasons.length > 0 && (
        <ul className="mt-2 text-xs text-sage-600 space-y-0.5 pl-1">
          {suggestion.reasons.map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
      )}
      <div className="progress-track mt-2">
        <div className="progress-fill" style={{ width: `${widthPct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {suggestion.effectiveTiles.slice(0, 14).map(t => (
          <MJTile key={t.code} code={t.code} size="sm" badge={t.remaining} dim={t.remaining === 0} />
        ))}
      </div>
    </div>
  );
}

function MeldAdder({ onAdd }: { onAdd: (type: 'pung' | 'kong', tile: string) => void }) {
  const [type, setType] = useState<'pung' | 'kong'>('pung');
  return (
    <div>
      <div className="inline-flex rounded-lg overflow-hidden border border-sage-300 mb-2 text-xs">
        <button
          onClick={() => setType('pung')}
          className={`px-3 py-1 ${type === 'pung' ? 'bg-sage-500 text-white' : 'bg-white text-sage-700'}`}
        >碰（刻子）</button>
        <button
          onClick={() => setType('kong')}
          className={`px-3 py-1 ${type === 'kong' ? 'bg-sage-500 text-white' : 'bg-white text-sage-700'}`}
        >杠（4 张）</button>
      </div>
      <div className="space-y-1">
        {(['m', 's', 'p'] as const).map(suit => (
          <div key={suit} className="flex items-center gap-2">
            <span className="label-tag w-10 justify-center text-xs">
              {suit === 'm' ? '万' : suit === 's' ? '条' : '筒'}
            </span>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => (
                <MJTile
                  key={`${r}${suit}`}
                  code={`${r}${suit}`}
                  size="sm"
                  onClick={() => onAdd(type, `${r}${suit}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// =============== 开局助手：定缺 / 换三张 / 碰决策 ===============

function OpeningAssistant({
  hand,
  melds,
  visible
}: {
  hand: string[];
  melds: { type: 'pung' | 'kong'; tile: string }[];
  visible: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'dingque' | 'swap3' | 'pong'>('dingque');
  const [pongTarget, setPongTarget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const fetchStrategy = async (mode: 'dingque' | 'swap3' | 'pong', extra?: any) => {
    if (hand.length === 0) {
      setErr('请先输入手牌');
      return;
    }
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const visibleCodes: string[] = [];
      for (const [k, v] of Object.entries(visible)) for (let i = 0; i < v; i++) visibleCodes.push(k);
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, handCodes: hand, visibleCodes, melds, ...(extra ?? {}) })
      });
      const data = await res.json();
      if (!data.ok) setErr(data.error ?? '请求失败');
      else setResult(data.result);
    } catch (e: any) {
      setErr(e?.message ?? '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card p-5 md:p-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-sage-800">🎲 开局/中盘助手</h2>
        <button onClick={() => setOpen(!open)} className="btn-ghost text-xs">
          {open ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <div className="flex gap-2 mb-3 flex-wrap">
            {[
              { k: 'dingque', label: '🌿 定缺建议' },
              { k: 'swap3', label: '🔄 换三张策略' },
              { k: 'pong', label: '🤝 是否碰' }
            ].map(t => (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k as any);
                  setResult(null);
                  setErr(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                  tab === t.k
                    ? 'bg-sage-500 text-white border-sage-500'
                    : 'bg-white text-sage-700 border-sage-200 hover:bg-sage-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'dingque' && (
            <div>
              <p className="text-xs text-sage-600 mb-2">
                开局阶段必选缺一门：枚举 m / s / p 三种方案，比较 "要打掉张数 + 剩余两门向听 - 暗刻/对子奖励"。
              </p>
              <button onClick={() => fetchStrategy('dingque')} disabled={loading} className="btn-primary text-sm">
                {loading ? '分析中…' : '生成建议'}
              </button>
            </div>
          )}

          {tab === 'swap3' && (
            <div>
              <p className="text-xs text-sage-600 mb-2">
                换三张：从手中选 3 张同色牌换出，倾向丢边张/幺九，最大化"换出后的剩余手牌质量"。
              </p>
              <button onClick={() => fetchStrategy('swap3')} disabled={loading} className="btn-primary text-sm">
                {loading ? '分析中…' : '生成建议'}
              </button>
            </div>
          )}

          {tab === 'pong' && (
            <div>
              <p className="text-xs text-sage-600 mb-2">
                别人打出某张牌时，根据手中是否有 ≥ 2 张同点，比较"碰后预期 EV"vs"不碰当前 EV"。
              </p>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-sage-700">别人打出的牌：</span>
                {(['m', 's', 'p'] as const).map(suit => (
                  <div key={suit} className="flex items-center gap-1">
                    <span className="label-tag text-xs">
                      {suit === 'm' ? '万' : suit === 's' ? '条' : '筒'}
                    </span>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => {
                      const c = `${r}${suit}`;
                      return (
                        <MJTile
                          key={c}
                          code={c}
                          size="sm"
                          highlight={pongTarget === c}
                          onClick={() => setPongTarget(c)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <button
                onClick={() => fetchStrategy('pong', { targetCode: pongTarget })}
                disabled={loading || !pongTarget}
                className="btn-primary text-sm"
              >
                {loading ? '分析中…' : `分析是否碰 ${pongTarget || '（先选牌）'}`}
              </button>
            </div>
          )}

          {err && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {err}
            </div>
          )}

          {result && tab === 'dingque' && (
            <div className="mt-3 space-y-2">
              <div className="pill bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                建议缺：{result.options.find((o: any) => o.suit === result.suggestedDrop)?.suitName}
              </div>
              <ul className="text-xs text-sage-600 space-y-0.5 pl-1">
                {result.reasons.map((r: string, i: number) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
              <div className="grid gap-2 mt-2">
                {result.options.map((o: any, i: number) => (
                  <div
                    key={o.suit}
                    className={`p-2 rounded-lg border ${
                      i === 0
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-sage-100 bg-white/50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-sage-700">
                      缺{o.suitName} （成本 {o.cost.toFixed(1)}）
                    </div>
                    <div className="text-xs text-sage-600">
                      该门 {o.tilesInSuit} 张 · 剩两门向听 {o.shantenAfter}
                      {o.hasTriplets && ' · 含暗刻'}
                      {o.hasPairs > 0 && ` · ${o.hasPairs} 对`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && tab === 'swap3' && Array.isArray(result) && (
            <div className="mt-3 space-y-2">
              {result.length === 0 ? (
                <div className="text-xs text-sage-500">没有合适的换三张方案</div>
              ) : (
                result.map((opt: any, i: number) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border ${
                      i === 0
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-sage-100 bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="pill bg-emerald-500 text-white text-xs">#{i + 1}</span>
                      <span className="text-xs text-sage-600">换出：</span>
                      {opt.swapOut.map((t: any) => (
                        <div key={t.code} className="flex items-center gap-0.5">
                          {Array.from({ length: t.count }).map((_, k) => (
                            <MJTile key={k} code={t.code} size="sm" />
                          ))}
                        </div>
                      ))}
                      <span className="text-xs text-sage-700">
                        换出后向听 <b>{opt.expectedShantenAfter}</b>
                      </span>
                    </div>
                    <ul className="text-xs text-sage-600 mt-1 pl-1">
                      {opt.reasons.map((r: string, j: number) => (
                        <li key={j}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {result && tab === 'pong' && (
            <div className="mt-3 p-3 rounded-lg border border-sage-100 bg-white/50">
              <div
                className={`pill text-xs ${
                  result.shouldPong
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}
              >
                {result.shouldPong ? '✅ 建议碰' : '⏸️ 建议不碰'}
              </div>
              <div className="text-xs text-sage-700 mt-2">
                碰后 EV：<b>{result.evWithPong.toFixed(2)}</b> · 不碰 EV：
                <b>{result.evWithoutPong.toFixed(2)}</b>
              </div>
              <ul className="text-xs text-sage-600 mt-1 pl-1">
                {result.reasons.map((r: string, i: number) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
