import { describe, expect, it } from 'vitest';
import type { Booking, Customer } from '../types';
import { validateBooking } from './booking';

// 2026-11-23 は月曜日、11-24 は火曜日（定休日）
const customers: Customer[] = [
  { id: 'c1', name: '山田花子', kana: 'ヤマダハナコ', phone: '', email: '', note: '', createdAt: '2026-01-01T00:00:00+09:00' },
];

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 'new',
    customerId: 'c1',
    staffId: 's1',
    menuId: 'm1',
    start: '2026-11-23T13:00:00+09:00',
    minutes: 60,
    status: 'reserved',
    memo: '',
    ...over,
  };
}

const existing = booking({ id: 'b1', start: '2026-11-23T13:00:00+09:00', minutes: 60 });
const data = { bookings: [existing], customers };
const empty = { bookings: [], customers };

describe('validateBooking', () => {
  it('問題のない予約は null を返す', () => {
    expect(validateBooking(booking(), empty)).toBeNull();
  });

  it('お客様が未選択ならエラー', () => {
    expect(validateBooking(booking({ customerId: '' }), empty)?.code).toBe('noCustomer');
  });

  it('日時が読めなければエラー', () => {
    expect(validateBooking(booking({ start: 'not-a-date' }), empty)?.code).toBe('invalidDate');
  });

  it('火曜日は定休日', () => {
    expect(validateBooking(booking({ start: '2026-11-24T13:00:00+09:00' }), empty)?.code).toBe('closedDay');
  });

  describe('営業時間（10:00〜20:00）の境界', () => {
    it.each([
      ['10:00開始は受け付ける', '2026-11-23T10:00:00+09:00', 60, null],
      ['9:30開始は営業時間外', '2026-11-23T09:30:00+09:00', 60, 'outsideHours'],
      ['19:00開始・60分で20:00ちょうどに終わるのは受け付ける', '2026-11-23T19:00:00+09:00', 60, null],
      ['19:30開始・60分で20:00を過ぎるのは営業時間外', '2026-11-23T19:30:00+09:00', 60, 'outsideHours'],
    ])('%s', (_, start, minutes, code) => {
      expect(validateBooking(booking({ start, minutes }), empty)?.code ?? null).toBe(code);
    });
  });

  describe('担当者の予約の重なり（既存：13:00〜14:00）', () => {
    it('同じ担当者で時間が重なればエラー', () => {
      const err = validateBooking(booking({ start: '2026-11-23T13:30:00+09:00' }), data);
      expect(err?.code).toBe('overlap');
      expect(err?.message).toContain('13:00〜 山田花子様');
    });

    it('前の予約が終わる時刻ちょうどに始まるのは重なりではない', () => {
      expect(validateBooking(booking({ start: '2026-11-23T14:00:00+09:00' }), data)).toBeNull();
    });

    it('担当者が違えば同じ時間でも受け付ける', () => {
      expect(validateBooking(booking({ staffId: 's2' }), data)).toBeNull();
    });

    it('キャンセル済みの予約とは重ならない', () => {
      const cancelled = { ...data, bookings: [{ ...existing, status: 'cancelled' as const }] };
      expect(validateBooking(booking(), cancelled)).toBeNull();
    });

    it('自分自身を編集するときは重なりに数えない', () => {
      expect(validateBooking({ ...existing, memo: '変更' }, data)).toBeNull();
    });

    it('キャンセルにする予約は重なりを確認しない', () => {
      expect(validateBooking(booking({ status: 'cancelled' }), data)).toBeNull();
    });
  });
});
