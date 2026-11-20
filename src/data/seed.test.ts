import { describe, expect, it } from 'vitest';
import { validateBooking } from '../domain/booking';
import { addDays } from '../lib/date';
import { createSeed } from './seed';

// 曜日によって「今週の過去分」と「過去の来店履歴」の重なり方が変わるので、1週間分の基準日で確かめる
const days = Array.from({ length: 7 }, (_, i) => addDays(new Date('2026-11-23T09:00:00+09:00'), i));

describe('createSeed', () => {
  it.each(days.map((d) => [d.toDateString(), d] as const))('サンプルデータの予約はすべてアプリのルールを満たす（基準日 %s）', (_, today) => {
    const data = createSeed(today);
    const broken = data.bookings
      .map((b) => ({ b, err: validateBooking(b, data) }))
      .filter(({ err }) => err !== null)
      .map(({ b, err }) => `${b.id} ${b.start} ${err?.code}`);
    expect(broken).toEqual([]);
  });

  it('予約がある程度の件数入っている（重なりを避けた結果、空になっていない）', () => {
    expect(createSeed(days[0]).bookings.length).toBeGreaterThan(150);
  });
});
