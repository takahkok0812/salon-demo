import type { AppData, Booking, Customer } from '../types';
import { visitStats } from '../lib/ai';

const DAY_MS = 86400000;

/** 当月1日から now までの来店済み売上（円） */
export function monthSales(data: Pick<AppData, 'bookings' | 'menus'>, now: Date): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return data.bookings
    .filter((b) => b.status === 'visited' && new Date(b.start) >= monthStart && new Date(b.start) <= now)
    .reduce((sum, b) => sum + (data.menus.find((m) => m.id === b.menuId)?.price ?? 0), 0);
}

/** now より前の予約のうち、キャンセルの割合（%・四捨五入） */
export function cancelRate(bookings: Booking[], now: Date): number {
  const past = bookings.filter((b) => new Date(b.start) < now);
  if (!past.length) return 0;
  return Math.round((past.filter((b) => b.status === 'cancelled').length / past.length) * 100);
}

/**
 * フォロー候補：いつもの来店間隔を過ぎていて、先の予約がないお客様。
 * 現在時刻を引数で受け取るので、日付を固定してテストできる。
 */
export function findFollowUps(data: AppData, now: Date, limit = 6) {
  return data.customers
    .map((c: Customer) => ({ c, s: visitStats(data, c.id) }))
    .filter(({ c, s }) => {
      if (!s.last || !s.intervalDays) return false;
      const due = new Date(new Date(s.last.start).getTime() + s.intervalDays * DAY_MS);
      const hasFuture = data.bookings.some(
        (b) => b.customerId === c.id && b.status === 'reserved' && new Date(b.start) > now,
      );
      return due < now && !hasFuture;
    })
    .slice(0, limit);
}
