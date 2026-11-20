import { describe, expect, it } from 'vitest';
import type { AppData, Booking } from '../types';
import { cancelRate, findFollowUps, monthSales } from './dashboard';

const now = new Date('2026-11-23T12:00:00+09:00');

function b(id: string, customerId: string, start: string, status: Booking['status']): Booking {
  return { id, customerId, staffId: 's1', menuId: 'm1', start, minutes: 60, status, memo: '' };
}

const base: AppData = {
  staff: [{ id: 's1', name: '担当A', color: '#000' }],
  menus: [{ id: 'm1', name: 'カット', minutes: 60, price: 5000 }],
  customers: [
    { id: 'c1', name: '来店間隔を過ぎた人', kana: '', phone: '', email: '', note: '', createdAt: '' },
    { id: 'c2', name: '次の予約がある人', kana: '', phone: '', email: '', note: '', createdAt: '' },
  ],
  bookings: [
    // c1: 30日おきに来店し、最後は10/1 → 目安の10/31を過ぎている
    b('1', 'c1', '2026-09-01T10:00:00+09:00', 'visited'),
    b('2', 'c1', '2026-10-01T10:00:00+09:00', 'visited'),
    // c2: 同じ間隔だが、先の予約がある
    b('3', 'c2', '2026-09-01T10:00:00+09:00', 'visited'),
    b('4', 'c2', '2026-10-01T10:00:00+09:00', 'visited'),
    b('5', 'c2', '2026-11-30T10:00:00+09:00', 'reserved'),
  ],
};

describe('findFollowUps', () => {
  it('来店間隔を過ぎていて、先の予約がないお客様だけを返す', () => {
    expect(findFollowUps(base, now).map(({ c }) => c.id)).toEqual(['c1']);
  });
});

describe('cancelRate', () => {
  it('過去の予約に占めるキャンセルの割合を返す', () => {
    const bookings = [...base.bookings, b('6', 'c1', '2026-11-02T10:00:00+09:00', 'cancelled')];
    expect(cancelRate(bookings, now)).toBe(20); // 過去5件中1件
  });

  it('過去の予約がなければ 0', () => {
    expect(cancelRate([], now)).toBe(0);
  });
});

describe('monthSales', () => {
  it('当月1日から現在までの来店済みだけを合計する', () => {
    const data = {
      ...base,
      bookings: [
        b('a', 'c1', '2026-11-01T10:00:00+09:00', 'visited'), // 対象
        b('b', 'c1', '2026-11-10T10:00:00+09:00', 'cancelled'), // キャンセルは除外
        b('c', 'c1', '2026-10-31T10:00:00+09:00', 'visited'), // 先月は除外
      ],
    };
    expect(monthSales(data, now)).toBe(5000);
  });
});
