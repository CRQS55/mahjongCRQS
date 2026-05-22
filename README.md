# 🀄 川麻小助手（Sichuan Mahjong Helper）

四川麻将（血战到底）AI 助手 — **拍照识牌 · 听牌分析 · 综合 EV 出牌决策 · 暗杠决策 · 番数结算 · 定缺 / 换三张 / 碰决策 · 测试水平 · 段位系统**。

小清新绿色风格，移动端友好，可一键部署到 Vercel。

---

## ✨ 功能

### 主页 `/`
1. **📷 拍照识牌**：用手机摄像头拍下手牌，由 Claude Vision 自动识别为牌码（万 / 条 / 筒 1-9）。
2. **🍀 听牌分析**：13 张时用严格胡牌枚举判断是否下叫；列出所有真听张、剩余张数、单张概率、整体胡牌概率以及每张胡牌的番数。
3. **🧠 综合推荐 = 下叫速度 + 考量番数（默认）**
   - **综合**分（绿色）：综合 EV 排序
   - **下叫速度**（蓝色）：能多快下叫 + 听张数差异
   - **考量番数**（紫色）：保留根/暗刻 + 七对/清一色潜力 - 拆根/拆暗刻代价
   - 借鉴 pystyle 何切る期待値計算与 riichi.wiki tile efficiency 的双轴思路
4. **⛓️ 暗杠候选纳入推荐**：手中有 4 张相同 → 自动作为一个候选 action 与打牌一起评分；暗杠 +1 根、不影响向听、几乎必然提升 EV
5. **⚡ 速度优先方案（备选可展开）**：原"最快下叫"算法的结果，仅当与 EV 主推荐不同才显示
6. **🧮 番数结算**：大对子 1 番 / 清一色 2 番 / 七对 2 番 / 龙七对 3 番 / 金钩钓 2 番 / 海底捞月 1 番 / 自摸 1 番 / **杠上花 +2 番** / **杠上炮 +1 番** / **抢杠胡 +1 番**
7. **🔢 根的两种结算**：加番 / 加底
8. **♻️ 剩余牌数输入**：场上已可见牌张数纳入概率分母
9. **🃏 已碰/杠副输入**：melds 参与缺一门、根、金钩钓判定
10. **🌿 缺一门校验**：枚举三方案的成本（要打掉多少张 + 剩余结构向听 + 强结构奖励），不再仅看张数最少

### 策略 API `/api/strategy`（开局 / 中盘助手）
11. **🎲 定缺建议** `mode=dingque`：枚举三种缺门方案，比较"打掉张数 + 剩余两门向听 - 暗刻/对子奖励"
12. **🔄 换三张策略** `mode=swap3`：选 3 张同色，最大化"换出后剩余手牌质量"，倾向丢边张/幺九
13. **🤝 碰决策** `mode=pong`：别人打牌时是否应碰，比较"碰后预期 EV"vs"不碰当前 EV"

> 主页"🎲 开局/中盘助手"面板已直接接入这三个工具，无需手动调 API。

### 测试水平 `/quiz`
14. **🎯 三个题型**
    - **T1 听几门牌**（用严格听牌枚举）
    - **T2 打哪张牌**（用 EV 综合推荐）
    - **T3 看局打牌**（T2 + 6-12 张可见弃牌）
    - **T5 安全牌**：占位"待开发"
    - 测试题自动排除"含 4 张相同"的题目（暗杠才是最优解，不公平）
15. **📊 加分公式**：T1 全对 +2 / 部分对按比例；T2/T3 Top1 +1.0 → Top5 +0.2，Top5 之外 -0.5
16. **🏆 段位系统**

| 段位 | 分数区间 |
|---|---|
| 黑铁 | 0–9 |
| 青铜 | 10–29 |
| 白银 | 30–59 |
| 黄金 | 60–99 |
| 铂金 | 100–149 |
| 钻石 | 150–209 |
| 超凡 | 210–279 |
| 神话 | 280–359 |
| 赋能 | 360+ |

---

## 🚀 本地运行

```powershell
cd sichuan-mahjong
npm install
copy .env.example .env.local
# 编辑 .env.local 填入你的 ANTHROPIC_API_KEY
npm run dev
```

打开 http://localhost:3000 。

跑测试：

```powershell
npm test           # 一次性跑所有 vitest 用例（17 个）
npm run test:watch # 监听模式
```

---

## 🌐 部署到 Vercel

1. 把本目录推到 GitHub 仓库（详见下方"推送步骤"）。
2. 在 [Vercel](https://vercel.com/new) 选择该仓库，框架选 **Next.js**（自动识别）。
3. 在 **Environment Variables** 里加入：
   - `ANTHROPIC_API_KEY` —— 必填，你的 Anthropic key（或第三方中转的 key）
   - `ANTHROPIC_BASE_URL` —— 可选，使用中转/反代时填
   - `ANTHROPIC_MODEL` —— 可选，默认 `claude-sonnet-4-6`
4. 点 Deploy，1 分钟后即可访问。

> ⚠️ Anthropic 接口仅支持 PNG / JPEG / GIF / WEBP，BMP / HEIC 等格式请先转换。
> ⚠️ `/api/recognize` 已限制最大 8 MB 图片、严格校验 base64、AI 识别后再做"每种 ≤ 4 张、总数 ≤ 14"二次过滤。

---

## 🧠 核心算法

模块拆分：

| 文件 | 职责 |
|---|---|
| `lib/mahjong/tiles.ts` | 牌型 / 编码 / `CountArray` 工具 |
| `lib/mahjong/analyzer.ts` | 向听数、缺一门、严格听牌枚举、速度模式 `suggestDiscards` |
| `lib/mahjong/scoring.ts` | 番种识别 + 加底/加番结算（含杠上花/炮/抢杠） |
| `lib/mahjong/ev.ts` | 综合 EV 评分（speed + value 双轴）、暗杠候选 `evaluateConcealedKong` |
| `lib/mahjong/strategy.ts` | 定缺 / 换三张 / 碰决策 |
| `lib/mahjong/winProb.ts` | 多步前瞻 winProbability DP（参考 pystyle 期待値計算） |
| `lib/mahjong/quiz-gen.ts` | T1/T2/T3 随机手牌生成器（自动排除含 4 张同的题目） |
| `lib/mahjong/score.ts` | 段位 / 加分 / localStorage 存档 |
| `lib/mahjong/index.ts` | 顶层 `analyze()` 入口、输入合法性校验、`objective: 'expectedScore'\|'speed'` 路由 |

### 关键算法

**1. 向听数与缺一门**
- 标准型：每门花色独立 DP 枚举 `(mentsu, taatsu, hasPair)`，三门组合后取最优
- 七对：`6 - pairs + max(0, 7 - kinds)`，仅 `meld=0` 时
- **缺一门**：枚举丢 m / s / p 三种方案，成本 = 该门张数 + 剩余两门标准向听；melds 已在的门跳过

**2. 胡牌函数拆分**
- `isStandardWinningHand` / `isSevenPairsWinningHand` / `isLongChitoitsuWinningHand` / `isWinningHand`

**3. 严格听牌枚举**
- `enumerateWaitingTilesStrict` 直接对 27 种进张挨个调 `isWinningHand` 验证，不靠公式
- winType 区分 standard / chitoitsu / longChitoitsu

**4. 有效进张过滤**
- `shantenAfter==0` 时直接调严格枚举得真听张
- `shantenAfter≥1` 时枚举每张可摸 t，要求 `calcShanten(after+t)` 下降，**且若下降到 0 必须能在保留 baseGen 个根的前提下下叫**——避免把"必须拆根才能下叫"算成有效进张

**5. EV 双轴评分**
```
expectedScore = speedScore + valueScore

speedScore = winRewardEstimate + tingValue
  winRewardEstimate = winProbability × baseScore × 2^maxFanPotential
  tingValue (听牌) = baseScore × 1.0 + winProbability × 4 × baseScore
  tingValue (1向听) = min(0.4 × baseScore, ukeireRatio × baseScore × 0.8)

valueScore = structureBonus - lostGenPenalty - lostTripletPenalty - riskPenalty
  structureBonus = preservedGen × 0.8 + preservedTriplets × 0.4
                 + (听牌时×0.3, 否则×1.0) × (七对/龙七对/大对子/清一色潜力)
  lostGenPenalty = lostGen × (1.2 × baseScore + 0.8)
  lostTripletPenalty = lostTriplets × (0.6 × baseScore + 0.4)
  riskPenalty = 0   // 占位
```

参考 pystyle 期待値計算 与 riichi.wiki Tile Efficiency 的双指标设计；听牌阶段仍保留 30% 结构权重，避免双对子结构被一刀切清零。

**6. 暗杠候选 `evaluateConcealedKong`**
- 手中 4 张相同 → 模拟"杠后再摸一张"的所有可能补牌，计算加权 EV
- 加上"杠本身奖励"（0.6×base + 1）
- 与 `evaluateDiscard` 一起进入推荐排序

**7. 杠上花 / 杠上炮 / 抢杠胡**
- 通过 `FanContext.isAfterKong / isKongDischarge / isRobKong` 传入
- `computeFan` 识别并加 +2 / +1 / +1 番
- UI 提供复选框

**8. 番种识别**
- 大对子：concealed 中每种 ∈ {0,2,3,4}，恰好一种 == 2（将），其余刻或暗杠刻；总刻数 + meldCount === 4
- 金钩钓：基于结构（4 副明刻/杠 + 单吊对子）
- 根：concealed 中 4 张 + melds 中 kong；龙七对时减 1

**9. 输入合法性校验**
- `/api/analyze` 拒绝：非法牌码、单种 > 4 张、melds 格式错、`baseScore ≤ 0`、`fanCap` 不是非负整数
- `/api/recognize`：图片 ≤ 8 MB、base64 合法；AI 返回二次过滤
- `/api/strategy`：mode 必须是 dingque/swap3/pong；牌码合法；pong 模式需 targetCode

---

## ✅ 测试

vitest 测试套件覆盖 17 个核心验收点（`tests/acceptance.test.ts` + `tests/ev.test.ts`）：

- shantenAfter === 0 必须有真听张
- `7777万 2334445666条`：EV 模式首推暗杠或非"打 7m"，speed 模式 7m 必须标"拆根/降番"
- 已碰第三门时不能绕过缺一门检查
- 七对听牌不被误标为 standard
- 标准/七对/龙七对独立判断
- 4 副明刻 + 单吊对子 → 金钩钓
- 明杠应被计入"根"
- 5 张同牌 / 负 baseScore / 非法 tile code 应被拒绝
- enumerateWaitingTilesStrict 含 melds 时正常工作
- 7m×4 死结构下任何 discard 不应同时是 1 向听 + 进张 0 张
- 22344678s 567999p：首推 2s 或 4s（听 6 张），9p 拆暗刻应排末位

```powershell
npm test
```

---

## 📁 目录结构

```
sichuan-mahjong/
├── app/
│   ├── api/
│   │   ├── recognize/route.ts    # 拍照识别（Claude Vision）
│   │   ├── analyze/route.ts      # 听牌/出牌/番数分析
│   │   ├── strategy/route.ts     # 定缺 / 换三张 / 碰决策
│   │   └── quiz/route.ts         # 随机题目接口
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                  # 主页（综合 + 速度 + 暗杠）
│   └── quiz/page.tsx             # 测试水平页
├── components/
│   ├── MJTile.tsx
│   └── TilePicker.tsx
├── lib/mahjong/
│   ├── tiles.ts
│   ├── analyzer.ts
│   ├── scoring.ts
│   ├── ev.ts                     # 双轴 EV + 暗杠
│   ├── strategy.ts               # 定缺 / 换三张 / 碰
│   ├── quiz-gen.ts
│   ├── score.ts
│   └── index.ts
├── tests/
│   ├── acceptance.test.ts
│   └── ev.test.ts
├── public/
│   ├── tiles/                    # 27 张麻将牌面图（最新素材，148×216）
│   ├── mahjong-sheet-v3.jpg      # 切图源
│   └── donate-qr.png
├── scripts/
│   └── extract-tiles-v3.ts
├── vitest.config.ts
└── tailwind.config.ts
```

---

## ⚠️ 已知简化与限制

- **不考虑防守**：`riskPenalty` 占位为 0，未实现放铳/危险张评估
- **未听 winProbability 用启发式 DP**（`estimateMultiTurnWinProb`，参考 pystyle 期待値計算）：
  - 1 向听用"先进听 → 再胡"两阶段累积
  - 2 向听用"先进 1 向听 → 进听 → 再胡"三阶段递归
  - 3+ 向听用粗略估计
  - 没有做完整状态空间的精确枚举（代价指数级）
- **EV 公式系数为经验值**，未用对局数据回归过；可在 `lib/mahjong/ev.ts` 调整
- **根的判定**采用 physical 4 张相同（不论是否被拆为顺+刻）

---

## 📝 反馈 & 商务合作

邮箱：**1507971639@qq.com**

## 📝 License

MIT — 仅供学习和娱乐参考。实际牌桌请遵守当地规则。

by: CRQS
