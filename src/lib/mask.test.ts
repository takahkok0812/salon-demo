import { describe, expect, it } from 'vitest';
import { mask } from './mask';

describe('mask', () => {
  it('先頭3文字と末尾2文字だけを残す', () => {
    expect(mask('090-1234-5678')).toBe('090****78');
  });
  it('空なら空のまま、短い値はすべて伏せる', () => {
    expect(mask('')).toBe('');
    expect(mask('abcd')).toBe('****');
  });
});
