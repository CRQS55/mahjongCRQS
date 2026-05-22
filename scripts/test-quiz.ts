import { genTenpaiHand, genNotenHand, genGameScene } from '../lib/mahjong/quiz-gen';

console.log('=== T1：5 个听牌题 ===');
for (let i = 0; i < 5; i++) {
  const q = genTenpaiHand();
  console.log(`#${i + 1}`, q.handCodes.join(' '), '→ 听', q.waitingTiles.map(w => w.code).join(','));
}

console.log('\n=== T2：5 个出牌题 ===');
for (let i = 0; i < 5; i++) {
  const q = genNotenHand();
  console.log(`#${i + 1}`, q.handCodes.join(' '), '→ Top:', q.bestDiscards.map(d => `${d.code}(${d.effectiveCount})`).join(' / '));
}

console.log('\n=== T3：3 个牌局题 ===');
for (let i = 0; i < 3; i++) {
  const q = genGameScene();
  console.log(`#${i + 1} 手:`, q.handCodes.join(' '));
  console.log(`     可见:`, q.visibleCodes.join(' '));
  console.log(`     Top:`, q.bestDiscards.map(d => `${d.code}(${d.effectiveCount})`).join(' / '));
}
