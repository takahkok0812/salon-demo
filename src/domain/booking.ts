import type { AppData, Booking } from '../types';
import { CLOSE_HOUR, OPEN_HOUR, overlaps, pad } from '../lib/date';

/** 定休日（0=日曜 … 6=土曜） */
export const CLOSED_WEEKDAY = 2;

/**
 * お店の時間帯（日本時間 UTC+9）。曜日や営業時間は、実行する環境のタイムゾーンに関係なく
 * 日本時間で判定する（Lambda など UTC で動く環境でも同じ結果になるように）。
 */
const SHOP_UTC_OFFSET_MIN = 9 * 60;

/** 日時をお店の時間帯での「曜日」と「その日の0時からの分」に分ける */
function shopClock(d: Date): { weekday: number; minutes: number } {
  const t = new Date(d.getTime() + SHOP_UTC_OFFSET_MIN * 60_000);
  return {
    weekday: t.getUTCDay(),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

function shopTime(d: Date): string {
  const { minutes } = shopClock(d);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

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
  const s = shopClock(start);
  if (s.weekday === CLOSED_WEEKDAY) return { code: 'closedDay', message: '火曜日は定休日です。' };

  const endMinutes = s.minutes + b.minutes;
  if (s.minutes < OPEN_HOUR * 60 || endMinutes > CLOSE_HOUR * 60) {
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
        message: `担当者の予約が重なっています（${shopTime(new Date(clash.start))}〜 ${who}様）。`,
      };
    }
  }
  return null;
}
