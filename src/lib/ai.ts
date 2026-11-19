import type { AppData, Booking, Customer } from '../types';
import { fmtDateLong, fmtTime } from './date';

/**
 * AI機能（デモ版）
 * 本番ではサーバー側（AWS Lambda）から Claude API を呼び出して文章を作ります。
 * このデモはブラウザだけで動かすため、同じ入出力の形で定型文を組み立てています。
 */

export function visitStats(data: AppData, customerId: string) {
  const visits = data.bookings
    .filter((b) => b.customerId === customerId && b.status === 'visited')
    .sort((a, b) => a.start.localeCompare(b.start));
  const menuCount = new Map<string, number>();
  let total = 0;
  for (const v of visits) {
    menuCount.set(v.menuId, (menuCount.get(v.menuId) ?? 0) + 1);
    total += data.menus.find((m) => m.id === v.menuId)?.price ?? 0;
  }
  const favoriteId = [...menuCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const favorite = data.menus.find((m) => m.id === favoriteId)?.name;
  const last = visits.at(-1);
  let intervalDays: number | null = null;
  if (visits.length >= 2) {
    const first = new Date(visits[0].start).getTime();
    const lastT = new Date(visits[visits.length - 1].start).getTime();
    intervalDays = Math.round((lastT - first) / 86400000 / (visits.length - 1));
  }
  return { count: visits.length, total, favorite, last, intervalDays };
}

export function summarizeCustomer(data: AppData, c: Customer, showAmount = true): string {
  const s = visitStats(data, c.id);
  if (s.count === 0) {
    return `${c.name}様は、まだ来店記録がありません。${c.note ? `メモ：${c.note}` : ''}`;
  }
  const parts = [
    showAmount ? `直近3か月で${s.count}回来店（合計${s.total.toLocaleString('ja-JP')}円）。` : `直近3か月で${s.count}回来店。`,
    s.favorite ? `よく利用するメニューは「${s.favorite}」。` : '',
    s.intervalDays ? `来店間隔はおよそ${s.intervalDays}日。` : '',
    s.last ? `前回は${fmtDateLong(new Date(s.last.start))}。` : '',
    c.note ? `接客メモ：${c.note}` : '',
  ];
  if (s.intervalDays && s.last) {
    const next = new Date(new Date(s.last.start).getTime() + s.intervalDays * 86400000);
    parts.push(`次回の来店目安は${fmtDateLong(next)}ごろ。`);
  }
  return parts.filter(Boolean).join('');
}

export function draftConfirmation(data: AppData, b: Booking): string {
  const c = data.customers.find((x) => x.id === b.customerId);
  const m = data.menus.find((x) => x.id === b.menuId);
  const s = data.staff.find((x) => x.id === b.staffId);
  const start = new Date(b.start);
  return [
    `${c?.name ?? 'お客'}様`,
    '',
    'このたびはご予約ありがとうございます。',
    '以下の内容でご予約を承りました。',
    '',
    `日時：${fmtDateLong(start)} ${fmtTime(start)}〜`,
    `メニュー：${m?.name ?? ''}（約${b.minutes}分）`,
    `担当：${s?.name ?? ''}`,
    '',
    '変更・キャンセルの際は、前日までにご連絡ください。',
    'ご来店を心よりお待ちしております。',
  ].join('\n');
}
