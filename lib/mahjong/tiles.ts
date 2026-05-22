/**
 * 四川麻将牌型定义
 *
 * 四川麻将（血战到底）规则要点：
 * - 只用 万(m) / 条(s) / 筒(p) 三门，无字牌、无花牌，共 108 张
 * - 必须"缺一门"：胡牌时手牌只能有两种花色
 * - 不能吃牌，只能碰、杠、胡
 * - 胡牌牌型：4 面子 + 1 对将 / 七对 / 龙七对（含 4 张相同的七对）
 */

// 0..8 -> 1m..9m, 9..17 -> 1s..9s, 18..26 -> 1p..9p
export type TileIndex = number;

export type Suit = 'm' | 's' | 'p';

export interface Tile {
  suit: Suit;
  rank: number; // 1..9
}

export const SUITS: Suit[] = ['m', 's', 'p'];
export const SUIT_LABEL: Record<Suit, string> = { m: '万', s: '条', p: '筒' };
export const TILE_KIND_COUNT = 27;
export const COPIES_PER_TILE = 4;

export function suitOffset(suit: Suit): number {
  return suit === 'm' ? 0 : suit === 's' ? 9 : 18;
}

export function tileToIndex(tile: Tile): TileIndex {
  return suitOffset(tile.suit) + (tile.rank - 1);
}

export function indexToTile(idx: TileIndex): Tile {
  const suit: Suit = idx < 9 ? 'm' : idx < 18 ? 's' : 'p';
  const rank = (idx % 9) + 1;
  return { suit, rank };
}

// "1m" / "5s" / "9p" <-> Tile
export function parseTile(code: string): Tile | null {
  if (code.length !== 2) return null;
  const rank = parseInt(code[0], 10);
  const suit = code[1] as Suit;
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) return null;
  if (!SUITS.includes(suit)) return null;
  return { suit, rank };
}

export function tileCode(tile: Tile): string {
  return `${tile.rank}${tile.suit}`;
}

export function indexToCode(idx: TileIndex): string {
  return tileCode(indexToTile(idx));
}

export function codeToIndex(code: string): TileIndex | null {
  const tile = parseTile(code);
  return tile ? tileToIndex(tile) : null;
}

export type CountArray = number[]; // length 27

export function emptyCounts(): CountArray {
  return new Array(TILE_KIND_COUNT).fill(0);
}

export function countsFromCodes(codes: string[]): CountArray {
  const counts = emptyCounts();
  for (const c of codes) {
    const idx = codeToIndex(c);
    if (idx === null) continue;
    counts[idx]++;
  }
  return counts;
}

export function totalTiles(counts: CountArray): number {
  return counts.reduce((a, b) => a + b, 0);
}

export function cloneCounts(counts: CountArray): CountArray {
  return counts.slice();
}

// 该牌所属花色（0=m,1=s,2=p）
export function suitOfIndex(idx: TileIndex): 0 | 1 | 2 {
  return (idx < 9 ? 0 : idx < 18 ? 1 : 2);
}

// 中文显示
export function tileDisplay(idx: TileIndex): string {
  const t = indexToTile(idx);
  return `${t.rank}${SUIT_LABEL[t.suit]}`;
}

// 整理排序：先按花色再按点数
export function sortIndices(indices: TileIndex[]): TileIndex[] {
  return [...indices].sort((a, b) => a - b);
}

export function countsToIndices(counts: CountArray): TileIndex[] {
  const result: TileIndex[] = [];
  for (let i = 0; i < TILE_KIND_COUNT; i++) {
    for (let k = 0; k < counts[i]; k++) result.push(i);
  }
  return result;
}
