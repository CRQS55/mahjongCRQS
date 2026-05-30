// Copies project tile PNGs into promo/public/tiles so Remotion can serve them.
// Run: npm run setup
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'public', 'tiles');
const dst = path.resolve(__dirname, '..', 'public', 'tiles');

if (!fs.existsSync(src)) {
  console.error('[copy-tiles] source not found:', src);
  process.exit(1);
}
fs.mkdirSync(dst, { recursive: true });

let n = 0;
for (const f of fs.readdirSync(src)) {
  if (!f.endsWith('.png')) continue;
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
  n++;
}
console.log(`[copy-tiles] copied ${n} tiles -> ${dst}`);
