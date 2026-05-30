# 素材生成清单 / GPTImage Prompts

> 所有 prompt 用英文以获得更稳定的生成结果，括号中给出中文意图说明。
> 生成完毕后，请将文件丢到 `promo/public/assets/` 下，文件名严格匹配。
>
> **输出比例规格**
> - 9:16 竖屏：用于全屏背景（HookScene、ScanScene 背景、EndScene 备用背景）
> - 1:1 / 16:9：本视频未使用，留空

---

## §1 `gpt-mahjong-table.png`  · 9:16 · HookScene

**用途**：第 0–3 秒的全屏背景。需要营造"夜晚麻将桌、玩家手悬空中、滴滴倒计时"的紧张感。

**Prompt（直接喂给 GPTImage / Midjourney / SDXL）**

```
A cinematic top-down vertical 9:16 photograph of a dimly lit mahjong table at night,
warm tungsten spotlight from above, blurred green felt surface, 14 white mahjong tiles
neatly arranged in front of the player, one tile slightly raised as if undecided,
a player's hand hovering above the tiles, hesitant pose, shallow depth of field,
soft bokeh, faint green ambient glow from screens around the room, moody, suspenseful,
photo-realistic, no text, no logo, no UI, leave space at the top half of the frame
for caption, dark vignette around edges. 1080x1920.
```

**反向（negative prompt）**：text, watermark, ugly hands, extra fingers, anime, cartoon, blue lighting

---

## §2 `gpt-scanning-hand.png`  · 9:16 · ScanScene 背景

**用途**：第 7–12 秒"AI 识牌"场景的背景，画面下半部呈现一排被扫描的麻将牌。

**Prompt**

```
A futuristic vertical 9:16 image of a row of white mahjong tiles seen from above on a
dark glossy surface, faint green grid floor, a thin horizontal scanning laser line of
warm gold light slicing across the row from left to right, tile faces partially
illuminated, subtle holographic AR brackets glowing at four corners, particles of
green light dust floating up, high-tech minimal aesthetic, leave the upper third
empty for caption, dark teal-green background, cinematic, photo-realistic, no text,
no logo. 1080x1920.
```

---

## §3 `gpt-green-tech-bg.png`  · 9:16 · EndScene 备用背景

**用途**：第 56–60 秒品牌收尾的备用背景。当前 EndScene 已用 CSS 渐变兜底，这张图作为可选替换。

**Prompt**

```
A clean vertical 9:16 abstract background, soft sage-green gradient from #e6f4e8 at
top to #3f854c at bottom, faint diagonal data-stream lines made of dotted gold light
moving across the canvas, subtle bokeh circles, very light Chinese mahjong tile
silhouettes embedded as watermark texture (white, 5% opacity), no text, no logo,
high-end mobile app launch screen vibe, minimal, premium. 1080x1920.
```

---

## §4 真实页面截图清单（需要你手动截图 / 录屏）

> 所有真实截图都是"备选" — 不提供也能渲染，只是仿 UI 兜底。
> 如果想要更高可信度，从 https://mjcrqs.top 截这几张图：

| 文件名                    | 截图建议                                                    |
|---------------------------|------------------------------------------------------------|
| `real-homepage.png`       | 首页全屏，确保"拍照识牌"按钮在画面中心                      |
| `real-tenpai.png`         | 输入 13 张已下叫的手牌后的结果，包含"已下叫" + 胡牌列表      |
| `real-top6.png`           | 输入 14 张手牌后"出牌建议 Top 6"区域的截图，需要包含进张/评分 |
| `real-visible-tiles.png`  | 已知可见牌输入弹窗 + 概率刷新后的结果                        |
| `real-strategy-dingque.png` | 定缺建议页 — 必需，StrategyScene 第 1 段 |
| `real-strategy-huansan.png` | 换三张策略页 — 必需，StrategyScene 第 2 段 |
| `real-strategy-peng.png`    | 是否碰决策页 — 必需，StrategyScene 第 3 段 |
| `real-scoring.png`        | 结算设置面板（底分、封顶、各番、每家应付）                   |
| `real-quiz.png`           | `/quiz` 页面，能看到 T1/T2/T3 题型 + 段位                    |

**截图建议**：
- 用 Chrome 设备模拟（iPhone 14 Pro / 393×852 DPR 3）截图，导出为 PNG。
- 截图尺寸保持竖屏，至少 720×1280。
- 不要带浏览器外框，截"网页内容区"。

---

## §5 一次性生成指令（拼接版）

如果你的 GPTImage 工具支持批量，你可以一次性把以下三段 prompt 全部丢进去（每段独立成一张图）：

```
[1] gpt-mahjong-table.png
{prompt §1 内容}

[2] gpt-scanning-hand.png
{prompt §2 内容}

[3] gpt-green-tech-bg.png
{prompt §3 内容}
```

---

## §6 如果不想生成图怎么办

每个用到 GPTImage 素材的场景都已写好兜底：

- `HookScene` — 没有 `gpt-mahjong-table.png` 时，用纯黑→深绿径向渐变
- `ScanScene` — 不依赖 `gpt-scanning-hand.png`，已用 CSS 网格 + 径向高光
- `EndScene` — 不依赖 `gpt-green-tech-bg.png`，已用 CSS 渐变 + SVG 数据流

**也就是说，只要 `npm run setup && npm run render`，零素材就能出片**。
