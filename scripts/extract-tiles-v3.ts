/**
 * 从 public/mahjong-sheet-v3.jpg 提取 27 张麻将牌
 *
 * Sheet 布局（用户提供，1280×1133）：
 *   Row 0 = Dots (筒, p)，top≈89, height≈174
 *   Row 1 = Bamboo (条, s)，top≈420, height≈174
 *   Row 2 = Symbols (万, m)，top≈754, height≈175
 *
 * 列 left（共 9 列，width≈119）：
 *   35, 174, 312, 451, 589, 726, 864, 1001, 1139
 *
 * 跑法：npx tsx scripts/extract-tiles-v3.ts
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SHEET = path.resolve(process.cwd(), 'public/mahjong-sheet-v3.jpg');
const OUT_DIR = path.resolve(process.cwd(), 'public/tiles');

// 行映射：从图中文字头判定
const ROW_SUITS: ('p' | 's' | 'm')[] = ['p', 's', 'm'];
const ROW_TOPS = [89, 420, 754];
const ROW_HEIGHT = 174;

// 列起始 x（已检测）
const COL_LEFTS = [35, 174, 312, 451, 589, 726, 864, 1001, 1139];
const COL_WIDTH = 119;

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = await sharp(SHEET).metadata();
  console.log('Sheet:', meta.width, 'x', meta.height);

  for (let row = 0; row < 3; row++) {
    const suit = ROW_SUITS[row];
    for (let col = 0; col < 9; col++) {
      const left = COL_LEFTS[col];
      const top = ROW_TOPS[row];
      const code = `${col + 1}${suit}`;
      const out = path.join(OUT_DIR, `${code}.png`);
      await sharp(SHEET)
        .extract({ left, top, width: COL_WIDTH, height: ROW_HEIGHT })
        .resize(148, 216, { fit: 'fill' })
        .png()
        .toFile(out);
      console.log('  ✓', code);
    }
  }
  console.log('Done — 27 tiles exported to', OUT_DIR);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
