# 素材生成清单 / GPTImage Prompts (v2)

> 所有 prompt 用英文以获得更稳定的生成结果，括号内是中文意图说明。
> 生成完毕后，请将文件丢到 `promo/public/assets/` 下，文件名严格匹配。
>
> **输出比例规格**
> - 9:16 竖屏 (1080×1920)：用于全屏背景
> - 1:1 (1024×1024)：仅 §C 头像
>
> **v2 改动总览**
> - 新增 §A `gpt-ai-coach-portrait.png`（AICoachScene 主角，**强烈建议生成**）
> - 新增 §B `gpt-thought-bubble-bg.png`（AI 聊天面板底纹）
> - 新增 §C `gpt-claude-avatar.png`（AI 头像，1:1 透明背景）
> - 新增 §D `gpt-input-table.png`（InputScene 背景，替代旧 ScanScene 背景）
> - 升级 §E `gpt-hook-cinematic.png`（替代旧 `gpt-mahjong-table.png`，更有"决断时刻"感）
> - 新增 §F `gpt-tenpai-spotlight.png`（TenpaiScene 升级背景）
> - 新增 §G `gpt-strategy-board.png`（StrategyScene 升级背景）
> - 新增 §H `gpt-quiz-arena.png`（QuizScene 升级背景）
> - 升级 §I `gpt-end-galaxy.png`（替代旧 `gpt-green-tech-bg.png`）
> - 可选 §J `gpt-scoring-coin.png`（ScoringScene 升级背景）

---

## §A `gpt-ai-coach-portrait.png` · 9:16 · AICoachScene 主形象 ★

**用途**：第 21–30s "AI 教练讲清楚：为什么是这一张" 的主背景。占据画面左 40%，右 60% 留给聊天面板。

**Prompt**

```
Vertical 9:16 cinematic portrait of an elegant AI mahjong coach:
a translucent jade-green holographic figure wearing a flowing traditional
Chinese scholar robe, holding a single softly glowing mahjong tile in the
right hand, gentle wise expression with a faint kind smile, half-transparent
silhouette showing thin golden data streams flowing through the body and
robe, deep dark teal-green void background, soft golden bokeh particles,
sage-green rim light from behind, subtle warm front fill light, the figure
positioned in the LEFT 40% of the frame so the right 60% remains empty for
a chat panel overlay, premium "tech meets traditional" aesthetic,
photo-realistic with subtle CG glow, no text, no logo, no UI, exactly five
fingers per hand. 1080x1920.
```

**Negative**：text, watermark, anime style, scary face, glowing red eyes, extra fingers, neon pink, blue dominant, cartoon

---

## §B `gpt-thought-bubble-bg.png` · 9:16 · AI 聊天面板底纹

**用途**：AICoachScene 右侧聊天面板的半透明底纹（叠在 §A 上）。

**Prompt**

```
Vertical 9:16 abstract background panel: very soft luminous gradient from
sage-green #2c5535 at the top fading to warm cream #fbfdf7 at the bottom,
ultra-faint hexagonal mesh pattern at 8% opacity, three or four extremely
subtle horizontal "data line" streaks in gold at 6% opacity, three or four
tiny mahjong tile silhouettes drifting in the background at 4% opacity,
premium clean dashboard feel, no text, no UI elements, no logo, no harsh
edges, no borders, suitable as a translucent card backdrop. 1080x1920.
```

---

## §C `gpt-claude-avatar.png` · 1:1 · 透明背景头像

**用途**：AICoachScene 左下角 AI 头像气泡。**输出必须为透明 PNG（带 alpha）**。

**Prompt**

```
Square 1:1 with TRANSPARENT BACKGROUND (alpha): a soft glowing translucent
jade-green orb mascot, smooth round shape, inside the orb a friendly tiny
face drawn with fine golden line strokes (two crescent eyes plus a small
subtle closed-mouth smile, NO mouth opening, NO teeth), surrounded by 6-8
small floating golden light particles, gentle inner glow, modern minimal AI
companion vibe, output as PNG with full transparency, 1024x1024.
```

**Negative**：solid background, square edges, text, watermark, scary, robotic, sharp edges

---

## §D `gpt-input-table.png` · 9:16 · InputScene 背景

**用途**：替代旧 ScanScene。3s 内同时展示"拍照"和"手点"两种录入方式。

**Prompt**

```
Vertical 9:16 split-mood image: left half shows a softly out-of-focus
mahjong tile being scanned by a thin warm-gold laser line on a dark glossy
surface; right half shows a graceful index finger gently tapping a small
glowing virtual mahjong tile button floating above the same surface;
the two halves blend smoothly through a subtle golden gradient seam in the
middle (no hard line); deep dark teal-green ambient lighting, premium
product photography aesthetic, leave the entire top 30% of the frame empty
for caption text, no UI text, no logo, no labels, exactly five fingers.
1080x1920.
```

---

## §E `gpt-hook-cinematic.png` · 9:16 · HookScene 背景（升级）

**用途**：替换旧 `gpt-mahjong-table.png`。要更强的"决断时刻"代入感。

**Prompt**

```
Vertical 9:16 cinematic top-down photograph of a player's hand frozen
mid-air over a fan of 14 mahjong tiles on dark green felt at night,
ONE single overhead spotlight casts a tight warm pool of light onto the
tiles while the rest of the table dissolves into shadow, the 8th tile from
the left is very slightly raised and glows faintly gold as if "chosen",
four candle-like ambient lights flicker far in the background bokeh,
heavy decision-moment mood, photo-realistic, hand has natural anatomy with
exactly five fingers, no UI, no text, no watermark, leave the entire UPPER
HALF of the frame empty for caption, strong dark vignette around edges.
1080x1920.
```

---

## §F `gpt-tenpai-spotlight.png` · 9:16 · TenpaiScene 背景

**Prompt**

```
Vertical 9:16 dramatic close-up of three mahjong tiles standing upright in
a row on dark green felt, soft warm rim light from above-right casts long
gentle shadows, behind each tile a very subtle vertical gold percentage bar
glows at 10% opacity (different heights to suggest probability), shallow
depth of field with front and back tiles slightly out of focus, premium
cinematic feel, no text, no UI, no numbers visible, leave top 25% empty
for caption. 1080x1920.
```

---

## §G `gpt-strategy-board.png` · 9:16 · StrategyScene 背景

**Prompt**

```
Vertical 9:16 elegant top-down photograph of a wooden table with sage-green
felt mat, three softly glowing mahjong tiles placed at three decision
points connected by faint dotted golden lines forming a triangle, ambient
warm side lighting suggests strategic thinking, the felt surface has a
very subtle compass-rose etching at 6% opacity in the center, premium
"chessboard for mahjong" vibe, no text, no logo, leave top 30% empty for
caption, cinematic shallow depth of field. 1080x1920.
```

---

## §H `gpt-quiz-arena.png` · 9:16 · QuizScene 背景

**Prompt**

```
Vertical 9:16 stylized image of a futuristic ranked-tier stage: rising
stepped stone podium glowing with soft inner sage-green light, six floating
tier medallions hover in a vertical sequence above the podium (bronze at
bottom, then silver, gold, platinum, diamond, mythic at top), particles
of warm gold light rising upward, deep dark teal cosmic backdrop, premium
e-sport tier reveal aesthetic, no text on the medallions, no logo, leave
top 25% empty for caption. 1080x1920.
```

---

## §I `gpt-end-galaxy.png` · 9:16 · EndScene 背景（升级）

**用途**：替换旧 `gpt-green-tech-bg.png`，让品牌收尾更有质感。

**Prompt**

```
Vertical 9:16 cinematic image of dozens of glowing mahjong tiles drifting
like stars in a deep teal-green cosmic void, the tiles slowly forming a
gentle vortex spiraling toward a warm golden glow gathered at the center
about 1/3 from the top, soft motion blur on outer tiles, golden light
particles, premium cinematic depth, sage-green and gold palette only
(no blue, no red), strong dark vignette, no text, no logo, leave the
center pocket empty for the brand title to land later. 1080x1920.
```

---

## §J `gpt-scoring-coin.png` · 9:16 · ScoringScene 背景（可选）

**Prompt**

```
Vertical 9:16 image of a softly warm-lit dark wooden table corner with two
neat stacks of polished bronze poker-style chips and a single white
mahjong tile leaning against them, gentle gold reflections on the chip
edges, the table surface faintly etched with calculator-grid lines at 5%
opacity, premium tasteful "settlement" aesthetic (NOT greedy, NOT casino),
sage-green ambient lighting, no text, no logo, leave the top 30% empty
for caption, cinematic shallow depth of field. 1080x1920.
```

---

## §K 真实页面截图清单（基本沿用旧版）

> 全部为"备选" — 不提供也能渲染。`true_add.png` 是 InputScene 必需。

| 文件名                       | 截图建议                                                    | 必需 / 备选 |
|------------------------------|------------------------------------------------------------|-------------|
| `true_add.png`               | 主页"手点加牌"UI 截图（已提供）                            | **必需**    |
| `real-homepage.png`          | 首页全屏，"拍照识牌"按钮在中心                              | 备选        |
| `real-tenpai.png`            | 13 张已下叫的结果，包含胡牌列表                             | 备选        |
| `real-top6.png`              | 14 张手牌"出牌建议 Top 6"区域                               | 备选        |
| `real-visible-tiles.png`     | 已知可见牌输入弹窗 + 概率刷新结果                           | 备选        |
| `real-strategy-dingque.png`  | 定缺建议页                                                  | 必需        |
| `real-strategy-huansan.png`  | 换三张策略页                                                | 必需        |
| `real-strategy-peng.png`     | 是否碰决策页                                                | 必需        |
| `real-scoring.png`           | 结算设置面板                                                | 备选        |
| `real-quiz.png`              | `/quiz` 页面，T1/T2/T3 + 段位                               | 备选        |
| `real-ai-explain.png`        | 主页点完"AI 解释"后的输出截图（用于 AICoachScene 衬底真实感）| **建议**    |

---

## §L 一次性批量生成清单（推荐）

如果你的 GPTImage 工具支持批量，按下面 9 张顺序丢进去（每段独立成图）：

```
[A] gpt-ai-coach-portrait.png  ← AICoach 主形象
[B] gpt-thought-bubble-bg.png  ← AI 面板底纹
[C] gpt-claude-avatar.png      ← 透明 1:1 头像
[D] gpt-input-table.png        ← InputScene 背景
[E] gpt-hook-cinematic.png     ← Hook 升级（替换旧 mahjong-table）
[F] gpt-tenpai-spotlight.png   ← Tenpai 背景
[G] gpt-strategy-board.png     ← Strategy 背景
[H] gpt-quiz-arena.png         ← Quiz 背景
[I] gpt-end-galaxy.png         ← End 背景（替换旧 green-tech-bg）
```

可选追加：`[J] gpt-scoring-coin.png`

---

## §M 如果不想生成图怎么办

每个新场景都建议写好兜底（CSS 渐变 + 仿 UI）。最低保真路线：
- 只生成 §A / §C / §D 三张（AICoach 主体不能省，否则新亮点没视觉支撑）
- 其余沿用旧素材或 CSS 兜底

最高保真路线：把 §A–§I 全部生成 + §J 补齐。
