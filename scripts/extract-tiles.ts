/**
 * 从 public/mahjong-sheet-v2.jpg 提取 27 张麻将牌（1-9 筒 / 1-9 条 / 1-9 万）
 * 网格参数：x0=4, y0=4, stepX=79, stepY=112, cellW=74, cellH=88
 *
 * 行顺序（从上到下）：筒 / 条 / 万
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SHEET = path.resolve(process.cwd(), 'public/mahjong-sheet-v2.jpg');
const OUT_DIR = path.resolve(process.cwd(), 'public/tiles');

const X0 = 4;
const Y0 = 4;
const STEP_X = 79;
const STEP_Y = 112;
const CELL_W = 74;
const CELL_H = 88;

const ROW_SUITS: ('p' | 's' | 'm')[] = ['p', 's', 'm'];

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = await sharp(SHEET).metadata();
  console.log('Sheet:', meta.width, 'x', meta.height);

  for (let row = 0; row < 3; row++) {
    const suit = ROW_SUITS[row];
    for (let col = 0; col < 9; col++) {
      const left = X0 + col * STEP_X;
      const top = Y0 + row * STEP_Y;
      const code = `${col + 1}${suit}`;
      const out = path.join(OUT_DIR, `${code}.png`);
      await sharp(SHEET)
        .extract({ left, top, width: CELL_W, height: CELL_H })
        .resize(148, 176, { fit: 'fill' })
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
