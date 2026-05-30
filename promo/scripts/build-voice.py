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
    # 01 hook        0–3s
    "打川麻，最纠结的就是这一刻——到底打哪张？",
    # 02 product    3–7s
    "打开川麻小助手，拍一下手牌，剩下的交给它。",
    # 03 scan       7–12s
    "万、条、筒自动识别，不用一张张手动点。",
    # 04 tenpai    12–18s
    "十三张时，它会告诉你：听没听牌，能胡哪些牌，还剩几张。",
    # 05 top6      18–26s
    "十四张时，它直接给出出牌建议Top六，哪张更优，排得清清楚楚。",
    # 06 value     26–32s
    "不只是看快不快，还会综合考虑牌型价值和番数潜力。",
    # 07 visible   32–38s
    "场上已经打出过什么牌，也能录入，剩余张数会跟着重新刷新。",
    # 08 strategy  38–45s
    "定缺、换三张、要不要碰，开局到中盘都能辅助判断。",
    # 09 scoring   45–51s
    "海底、杠上花、抢杠胡、加番加底，结算也不用再心算。",
    # 10 quiz      51–56s
    "想练判断？还有测试水平模式，听几门、打哪张、看局打牌，一边练一边升段。",
    # 11 end       56–60s
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
