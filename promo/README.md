# 川麻小助手宣传视频 · 60s 9:16

基于 [Remotion](https://www.remotion.dev/) 制作的竖屏短视频广告，配色与字体直接对齐主项目（sage 绿 + PingFang SC）。

> **v2 改动**：砍掉 5s 拍照特写场景（旧 ScanScene），并入 3s 的 **InputScene**（拍一下/点一下双演示）；删除 ValueScene，新增 9s 的 **AICoachScene** 作为新亮点（呼应主页"AI 解释"功能）。详见 `timeline.md`。

## 目录结构

```
promo/
├── README.md                  ← 本文件
├── timeline.md                ← 镜头时间轴 / 旁白卡点 / 音效（v2）
├── ASSETS_PROMPTS.md          ← 所有 GPTImage / 截图占位清单 + Prompt（v2，9 张新图）
├── package.json               ← Remotion 4.x 依赖
├── remotion.config.ts
├── tsconfig.json
├── scripts/
│   ├── copy-tiles.js          ← 把主项目 /public/tiles 拷过来
│   └── build-voice.py         ← edge-tts 生成 11 段中文旁白
├── public/
│   ├── tiles/                 ← npm run setup 生成
│   ├── audio/                 ← voice-01..11.mp3
│   └── assets/                ← TODO: 把 GPTImage / 真实截图丢进来
└── src/
    ├── index.ts
    ├── Root.tsx               ← Composition 注册（1800 帧 @ 30fps）
    ├── PromoVideo.tsx         ← 11 个 Series.Sequence
    ├── constants.ts           ← FPS / 配色 / 时间轴
    ├── components/
    │   ├── BigCaption.tsx
    │   ├── MJTile.tsx
    │   ├── PhoneFrame.tsx
    │   ├── SceneBackground.tsx
    │   └── ScreenshotPlaceholder.tsx
    └── scenes/
        ├── HookScene.tsx
        ├── ProductIntroScene.tsx
        ├── InputScene.tsx           ★ v2 新增（替代 ScanScene）
        ├── TenpaiScene.tsx
        ├── Top6Scene.tsx
        ├── AICoachScene.tsx         ★ v2 新增（替代 ValueScene，新亮点）
        ├── VisibleTilesScene.tsx
        ├── StrategyScene.tsx
        ├── ScoringScene.tsx
        ├── QuizScene.tsx
        └── EndScene.tsx
```

> 旧文件 `ScanScene.tsx` / `ValueScene.tsx` 已不再被引用，可保留备查也可删除。

## 快速上手

```bash
cd promo
npm install
npm run setup           # 复制主项目 27 张牌 PNG -> public/tiles
npm run start           # Remotion Studio 预览（http://localhost:3000）
npm run render          # 输出 MP4 -> out/promo.mp4
npm run render:webm     # 备用 VP9 输出
```

> 视频规格：1080×1920 @ 30fps，总长 60 秒（1800 帧）。

## 替换占位素材

所有"真实页面截图"和"GPTImage 生成图"都通过 `staticFile('assets/<name>')` 读取，缺失时会显示兜底，不会让构建失败。

### 真实页面截图（来自 mjcrqs.top 录屏 / 截图）

| 文件名                       | 用于场景                  | 备选 / 必需 |
|------------------------------|---------------------------|-------------|
| `true_add.png`               | InputScene 03 — 手点加牌真实截图 | **必需**   |
| `real-homepage.png`          | ProductIntroScene 02      | 备选        |
| `real-tenpai.png`            | TenpaiScene 04            | 备选        |
| `real-top6.png`              | Top6Scene 05              | 备选        |
| `real-visible-tiles.png`     | VisibleTilesScene 07      | 备选        |
| `real-strategy-dingque.png`  | StrategyScene 08 (定缺)   | 必需        |
| `real-strategy-huansan.png`  | StrategyScene 08 (换三张) | 必需        |
| `real-strategy-peng.png`     | StrategyScene 08 (是否碰) | 必需        |
| `real-scoring.png`           | ScoringScene 09           | 备选        |
| `real-quiz.png`              | QuizScene 10              | 备选        |

> 当前所有真实截图位都已用仿 UI 兜底，颜色/字体/按钮跟主项目 Tailwind sage 配色一致。

### GPTImage 生成图（v2，9 张新图）

| 文件名                          | 用于场景             | 必需 / 可选 |
|---------------------------------|---------------------|-------------|
| `gpt-hook-cinematic.png`        | HookScene 01 背景    | 替换 gpt-mahjong-table.png |
| `gpt-input-table.png`           | InputScene 03 背景   | 可选（有 CSS 兜底） |
| **`gpt-ai-coach-portrait.png`** | AICoachScene 06 主形象 | **必需**（新亮点视觉支撑） |
| **`gpt-thought-bubble-bg.png`** | AICoachScene 06 面板底纹 | **必需** |
| **`gpt-claude-avatar.png`**     | AICoachScene 06 头像（1:1 透明背景） | **必需** |
| `gpt-tenpai-spotlight.png`      | TenpaiScene 04 升级背景 | 可选 |
| `gpt-strategy-board.png`        | StrategyScene 08 升级背景 | 可选 |
| `gpt-quiz-arena.png`            | QuizScene 10 升级背景 | 可选 |
| `gpt-end-galaxy.png`            | EndScene 11 升级背景 | 可选（替换 gpt-green-tech-bg.png） |
| `gpt-scoring-coin.png`          | ScoringScene 09 升级背景 | 可选 |

> 完整 prompt 见 `ASSETS_PROMPTS.md`。直接喂给 GPTImage / Midjourney / SDXL 即可。

## 旁白与音频

- 旁白：`scripts/build-voice.py` + edge-tts，已经生成 11 段中文女声 mp3 在 `public/audio/voice-01.mp3 … voice-11.mp3`，按 `SCENES[]` 时间轴自动对齐到每镜头开头。
- **v2 改动了文案**（拍照特写删除 / 新增 AI 教练 / 测验补 AI 复盘），需要重新跑：

```bash
python scripts/build-voice.py
```

- BGM：默认关。把无版权 mp3 丢到 `public/audio/bgm.mp3`，再把 `src/PromoVideo.tsx` 里的 `HAS_BGM` 改为 `true` 就能挂上（建议 90–110 BPM 轻快电子或 lo-fi）。

## 设计原则

- 不展示算法公式或 EV 细节
- 真实截图 + 仿 UI 卡片混用，颜色完全对齐主项目 `tailwind.config.ts` 的 `sage` 调色板
- 每镜头 3–9 s，全程 BigCaption 字幕大且短
- 麻将牌组件复用主项目 `/public/tiles/*.png`，不重画
- v2 起，"AI 教练为什么这么打"是核心卖点，节奏在 21–30s 给足 9 秒

## 主项目零侵入

`promo/` 是一个独立 npm 项目：

- 不修改 `app/` / `components/` / `lib/`
- 仅通过 `scripts/copy-tiles.js` **只读拷贝** 27 张牌 PNG
- `package.json` / `node_modules` 与主项目互不干扰
