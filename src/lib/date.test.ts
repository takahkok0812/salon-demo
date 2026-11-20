import { describe, expect, it } from 'vitest';
import { overlaps, startOfWeek } from './date';

describe('startOfWeek', () => {
  it('月曜始まりで週の初日を返す', () => {
    expect(startOfWeek(new Date('2026-11-25T15:00:00+09:00')).getDate()).toBe(23); // 水曜 → 月曜
  });

  it('日曜日は前の月曜日に属する', () => {
    expect(startOfWeek(new Date('2026-11-29T10:00:00+09:00')).getDate()).toBe(23);
  });
});

describe('overlaps', () => {
  const at = (hm: string) => new Date(`2026-11-23T${hm}:00+09:00`);

  it('一部が重なれば true', () => {
    expect(overlaps(at('13:00'), 60, at('13:30'), 30)).toBe(true);
  });

  it('片方がもう片方を包んでいても true', () => {
    expect(overlaps(at('13:00'), 120, at('13:30'), 30)).toBe(true);
  });

  it('終わりと始まりが接しているだけなら false', () => {
    expect(overlaps(at('13:00'), 60, at('14:00'), 60)).toBe(false);
  });
});
