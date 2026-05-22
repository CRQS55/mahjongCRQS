# 🀄 川麻小助手（Sichuan Mahjong Helper）

四川麻将（血战到底）自动计算器 — **拍照识牌 · 听牌分析 · 出牌建议 · 番数结算**。

小清新绿色风格，移动端友好，可一键部署到 Vercel。

## ✨ 功能

1. **📷 拍照识牌**：用手机摄像头拍下手牌，由 Claude Vision 自动识别为牌码（万 / 条 / 筒 1-9）。
2. **🍀 听牌分析**：13 张时自动判断是否下叫，列出可胡的所有牌、剩余张数、番数。
3. **🎯 出牌建议**：14 张时给出 Top 6 弃牌方案，按"打后向听数 → 有效进张总数"排序，带可视化进度条。
4. **🧮 番数结算**：内置川麻常见番种 — 大对子 1 番 / 清一色 2 番 / 七对 2 番 / 龙七对 3 番 / 金钩钓 2 番 / 海底捞月 1 番。
5. **🔢 根的两种结算**：用户可切换 **加番** 或 **加底**。
6. **♻️ 剩余牌数输入**：拍照只能看自己的牌；用户可以告诉系统"对家打了几张 5 万"等，进行二次分析以更准确估算有效进张概率。
7. **🌿 缺一门校验**：自动判定缺一门，三门齐时建议舍弃哪门。

## 🚀 本地运行

```powershell
cd sichuan-mahjong
npm install
copy .env.example .env.local
# 编辑 .env.local 填入你的 ANTHROPIC_API_KEY
npm run dev
```

打开 http://localhost:3000 。

## 🌐 部署到 Vercel

1. 把本目录推到 GitHub 仓库。
2. 在 [Vercel](https://vercel.com/new) 选择该仓库，框架选 **Next.js**（自动识别）。
3. 在 **Environment Variables** 里加入：
   - `ANTHROPIC_API_KEY` —— 必填，你的 Anthropic key（或第三方中转的 key）
   - `ANTHROPIC_BASE_URL` —— 可选，使用中转/反代时填它，例如 `https://your-relay.example.com`（不带尾斜杠、不带 `/v1`）
   - `ANTHROPIC_MODEL` —— 可选，默认 `claude-sonnet-4-6`，可改 `claude-opus-4-7` 或 `claude-haiku-4-5-20251001`
4. 点 Deploy，1 分钟后即可访问。

> ⚠️ Anthropic 接口仅支持 PNG / JPEG / GIF / WEBP，BMP / HEIC 等格式请先转换。

## 🧠 核心算法

- `lib/mahjong/tiles.ts` — 牌型与编码工具
- `lib/mahjong/analyzer.ts` — 向听数（Shanten）、胡牌判定、听牌枚举、出牌建议
- `lib/mahjong/scoring.ts` — 番种识别 + 加底/加番结算
- `lib/mahjong/index.ts` — 顶层 `analyze()` 入口

向听数算法：经典三花色独立 DP + 标准型 / 七对型并行枚举，叠加四川"缺一门"约束。胡牌判定使用对子作将后的递归刻/顺分解。

测试：`npx tsx scripts/test-algo.ts`（20+ 用例覆盖大对子、清一色、龙七对、海底、根、加底加番差异等）。

## 📁 目录结构

```
sichuan-mahjong/
├── app/
│   ├── api/
│   │   ├── recognize/route.ts    # 拍照识别（调 Claude Vision）
│   │   └── analyze/route.ts      # 听牌/出牌/番数分析
│   ├── globals.css               # 小清新绿主题样式
│   ├── layout.tsx
│   └── page.tsx                  # 单页主界面
├── components/
│   ├── MJTile.tsx                # 单张麻将牌组件
│   └── TilePicker.tsx            # 选牌面板
├── lib/mahjong/                  # 核心算法
├── scripts/test-algo.ts          # 算法自测
└── tailwind.config.ts
```

## 🎮 使用流程

1. 点击 **📷 拍照识牌**，对准手牌拍一张（或从相册选）。
2. 检查识别结果，点错的牌可单击 ×，少了的牌从下方面板补。
3. （可选）展开 **② 已知打出/可见的牌**，告诉系统场上已经见过哪些牌（自己摸到 / 别家打出）。
4. 在 **③ 结算设置** 选根模式（加番/加底）、是否海底、底分、封顶。
5. 点 **🍀 开始分析**。

## 🔒 隐私

- 拍摄的图片只在 Vercel 服务器中转一次发给 Claude Vision，不入库不存盘。
- API key 仅存在 Vercel 环境变量，前端代码看不到。

## 📝 License

MIT — 仅供学习与娱乐参考。实际牌桌请遵守当地规则。
