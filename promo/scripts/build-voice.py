"""
Generate 11 voiceover MP3s with edge-tts and drop them into public/audio/.

Usage:
    python scripts/build-voice.py

Voice: zh-CN-XiaoxiaoNeural (default warm female).
       zh-CN-XiaoyiNeural is a younger short-video style; switch via VOICE env var.

The 11 lines map 1-to-1 onto the SCENES[] array in src/constants.ts.
"""
import asyncio
import os
import sys
from pathlib import Path

import edge_tts

VOICE = os.environ.get("VOICE", "zh-CN-XiaoxiaoNeural")
RATE = os.environ.get("RATE", "+8%")     # slightly punchier for short-video
PITCH = os.environ.get("PITCH", "+0Hz")
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"

LINES = [
    # 01 hook         3s window — keep punchy
    "打川麻最纠结的，就是这一刻。",
    # 02 productIntro 3s window — URL is what users need to remember
    "打开浏览器，访问 mjcrqs.top。",
    # 03 input        3s window — was too long
    "拍一下，或者点一下，都行。",
    # 04 tenpai       5s window
    "十三张时，它告诉你听没听牌、还剩几张。",
    # 05 top6         7s window
    "十四张时，直接给出出牌建议Top六，哪张更优一目了然。",
    # 06 aiCoach      9s window ★ — was 10.7s, must trim
    "AI教练直接讲明白：为什么这张更好。下叫多快、保留哪根、和第二名差在哪——一句话讲透。",
    # 07 visibleTiles 5s window
    "场上打过的牌也能录入，剩余张数自动重算。",
    # 08 strategy     6s window
    "定缺、换三张、要不要碰，开局到中盘都帮你想。",
    # 09 scoring      5s window — was 5.5s, trim
    "番数结算也能一键搞定，不用心算。",
    # 10 quiz         6s window
    "测试水平模式还能复盘——答错了，AI 告诉你为什么。",
    # 11 end          8s window
    "川麻小助手，让每一次选择，都有参考答案。",
]


async def synth(idx: int, text: str) -> Path:
    fname = OUT / f"voice-{idx:02d}.mp3"
    fname.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(str(fname))
    size_kb = fname.stat().st_size // 1024
    print(f"  [{idx:02d}] {fname.name}  {size_kb} KB  {text}")
    return fname


async def main():
    print(f"voice = {VOICE}   rate = {RATE}   pitch = {PITCH}")
    print(f"out   = {OUT}")
    print(f"lines = {len(LINES)}")
    print("-" * 60)
    for i, line in enumerate(LINES, start=1):
        await synth(i, line)
    print("-" * 60)
    print("done.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(130)
