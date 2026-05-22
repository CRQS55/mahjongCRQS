/**
 * EV 评分相关单元测试
 */
import { describe, it, expect } from 'vitest';
import { analyze } from '@/lib/mahjong';

describe('EV 字段完整性', () => {
  const handCodes = [
    '7m', '7m', '7m', '7m',
    '2s', '3s', '3s', '4s', '4s', '4s', '5s', '6s', '6s', '6s'
  ];

  it('EV 模式建议必须包含完整的字段', () => {
    const result = analyze({
      handCodes,
      objective: 'expectedScore',
      genMode: 'fan',
      fanCap: 5
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestedDiscards).toBeDefined();
    for (const s of result.suggestedDiscards!) {
      expect(typeof s.expectedScore).toBe('number');
      expect(typeof s.winProbability).toBe('number');
      expect(typeof s.averageFan).toBe('number');
      expect(typeof s.maxFanPotential).toBe('number');
      expect(typeof s.lostGen).toBe('number');
      expect(typeof s.preservedGen).toBe('number');
      expect(typeof s.sevenPairsPotential).toBe('number');
      expect(typeof s.longSevenPairsPotential).toBe('number');
      expect(typeof s.allPungsPotential).toBe('number');
      expect(typeof s.pureSuitPotential).toBe('number');
      expect(typeof s.riskPenalty).toBe('number');
      expect(Array.isArray(s.reasons)).toBe(true);
    }
  });

  it('EV 排序：suggestedDiscards 按 expectedScore 降序', () => {
    const result = analyze({
      handCodes,
      objective: 'expectedScore',
      genMode: 'fan',
      fanCap: 5
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const list = result.suggestedDiscards!;
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].expectedScore).toBeGreaterThanOrEqual(list[i].expectedScore);
    }
  });
});
