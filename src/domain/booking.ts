import type { AppData, Booking } from '../types';
import { CLOSE_HOUR, OPEN_HOUR, addMinutes, fmtTime, overlaps } from '../lib/date';

/** 定休日（0=日曜 … 6=土曜） */
export const CLOSED_WEEKDAY = 2;

export type BookingErrorCode = 'noCustomer' | 'invalidDate' | 'closedDay' | 'outsideHours' | 'overlap';

export interface BookingError {
  code: BookingErrorCode;
  message: string;
}

/**
 * 予約を保存してよいかを判定する。
 * 問題がなければ null、あれば最初に見つかった理由を返す。
 * 画面から切り離した純粋関数なので、単体テストで境界値を確認できる。
 */
export function validateBooking(b: Booking, data: Pick<AppData, 'bookings' | 'customers'>): BookingError | null {
  if (!b.customerId) return { code: 'noCustomer', message: 'お客様を選んでください。' };

  const start = new Date(b.start);
  if (Number.isNaN(start.getTime())) return { code: 'invalidDate', message: '日時を正しく入力してください。' };
  if (start.getDay() === CLOSED_WEEKDAY) return { code: 'closedDay', message: '火曜日は定休日です。' };

  const end = addMinutes(start, b.minutes);
  const open = new Date(start);
  open.setHours(OPEN_HOUR, 0, 0, 0);
  const close = new Date(start);
  close.setHours(CLOSE_HOUR, 0, 0, 0);
  if (start < open || end > close) {
    return { code: 'outsideHours', message: `営業時間（${OPEN_HOUR}:00〜${CLOSE_HOUR}:00）内で予約してください。` };
  }

  // キャンセル扱いの予約は枠を使わないので、重なりを確認しない
  if (b.status !== 'cancelled') {
    const clash = data.bookings.find(
      (o) =>
        o.id !== b.id &&
        o.staffId === b.staffId &&
        o.status !== 'cancelled' &&
        overlaps(new Date(o.start), o.minutes, start, b.minutes),
    );
    if (clash) {
      const who = data.customers.find((c) => c.id === clash.customerId)?.name ?? '';
      return {
        code: 'overlap',
        message: `担当者の予約が重なっています（${fmtTime(new Date(clash.start))}〜 ${who}様）。`,
      };
    }
  }
  return null;
}
