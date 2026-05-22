/**
 * 自动检测网格：扫描每行/每列像素均值，找出"间隙"位置（背景色），从而推断网格起点
 */
import sharp from 'sharp';

const SHEET = 'public/mahjong-sheet.png';

async function main() {
  const img = sharp(SHEET);
  const meta = await img.metadata();
  const { width, height } = meta;
  if (!width || !height) throw new Error('no size');

  const raw = await img.raw().toBuffer();
  const channels = meta.channels || 4;

  // 每个像素的"亮度"（简化为 R 通道）
  function lum(x: number, y: number): number {
    const i = (y * width! + x) * channels;
    return raw[i] + raw[i + 1] + raw[i + 2];
  }

  // 行均值（识别水平间隙：均值很高=空白）
  const rowMean: number[] = [];
  for (let y = 0; y < height; y++) {
    let s = 0;
    for (let x = 0; x < width; x++) s += lum(x, y);
    rowMean.push(s / width);
  }
  // 列均值
  const colMean: number[] = [];
  for (let x = 0; x < width; x++) {
    let s = 0;
    for (let y = 0; y < height; y++) s += lum(x, y);
    colMean.push(s / height);
  }

  // 找出"显著高于平均"的行（背景行）
  const rAvg = rowMean.reduce((a, b) => a + b, 0) / rowMean.length;
  const cAvg = colMean.reduce((a, b) => a + b, 0) / colMean.length;
  console.log('avg row lum =', rAvg, 'col lum =', cAvg);

  // 找出 row 中最大值附近的几个（垂直间隙）
  // 简化：输出每 50px 平均，眼看找规律
  console.log('\n行均值（每 20px 取一次）：');
  for (let y = 0; y < height; y += 20) {
    const v = rowMean[y].toFixed(1);
    const bar = '#'.repeat(Math.max(0, Math.floor((rowMean[y] - 400) / 20)));
    console.log(`  y=${y.toString().padStart(3)}: ${v} ${bar}`);
  }
  console.log('\n列均值（每 20px 取一次）：');
  for (let x = 0; x < width; x += 20) {
    const v = colMean[x].toFixed(1);
    const bar = '#'.repeat(Math.max(0, Math.floor((colMean[x] - 400) / 20)));
    console.log(`  x=${x.toString().padStart(3)}: ${v} ${bar}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
