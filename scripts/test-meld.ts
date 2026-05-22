import { analyze } from '../lib/mahjong';

console.log('=== 用户真实场景：碰了 5万 + 6万 + 7万（3 副） + 手里 2233万 ===');
const r = analyze({
  handCodes: ['2m','2m','3m','3m'],
  melds: [
    { type: 'pung', tile: '5m' },
    { type: 'pung', tile: '6m' },
    { type: 'pung', tile: '7m' }
  ],
  genMode: 'fan',
  baseScore: 1
});
if (r.ok) {
  console.log('phase:', r.phase, 'shanten:', r.shanten.shanten);
  console.log('waiting:', r.waitingTiles?.map((w: any) => w.code + '(剩' + w.remaining + ',' + w.fan + '番)'));
  console.log('warnings:', r.warnings);
} else {
  console.log('error:', r.error);
}

console.log('\n=== 等价：碰了 1万 + 7万 + 9万（3 副） + 手里 2233万 ===');
const r2 = analyze({
  handCodes: ['2m','2m','3m','3m'],
  melds: [
    { type: 'pung', tile: '1m' },
    { type: 'pung', tile: '7m' },
    { type: 'pung', tile: '9m' }
  ],
  genMode: 'fan',
  baseScore: 1
});
if (r2.ok) {
  console.log('phase:', r2.phase, 'shanten:', r2.shanten.shanten);
  console.log('waiting:', r2.waitingTiles?.map((w: any) => w.code + '(剩' + w.remaining + ',' + w.fan + '番)'));
  console.log('warnings:', r2.warnings);
} else {
  console.log('error:', r2.error);
}
