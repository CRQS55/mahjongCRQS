# Audio assets

## `voice-01.mp3` … `voice-11.mp3`
由 `scripts/build-voice.py`（edge-tts，免费微软神经网络 TTS）批量生成。
重新生成：

```bash
cd promo
python scripts/build-voice.py
# 想换音色：set VOICE=zh-CN-XiaoyiNeural && python scripts/build-voice.py   (PowerShell: $env:VOICE='zh-CN-XiaoyiNeural')
# 想调语速：set RATE=+12%
```

可选音色（中文女声 / 男声）：
- `zh-CN-XiaoxiaoNeural`  — 默认，柔和女声
- `zh-CN-XiaoyiNeural`    — 年轻女声，适合短视频
- `zh-CN-YunxiNeural`     — 男声
- `zh-CN-YunyangNeural`   — 男声新闻播报

## `bgm.mp3`（可选）
- 默认未启用。在 `src/PromoVideo.tsx` 把 `HAS_BGM` 改为 `true` 即可加挂。
- 推荐找无版权 BGM 的来源：
  - https://pixabay.com/music/  → 搜 "upbeat lofi" / "tech corporate"
  - https://www.bensound.com/   → 选 Royalty Free / Pop / Electronic
  - YouTube Audio Library
- 长度建议 ≥ 60s，曲速 90–110 BPM 比较贴广告气质。
- 文件丢这里命名 `bgm.mp3` 即可。
