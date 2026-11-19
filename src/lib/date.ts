export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 20;
export const SLOT_MIN = 30;

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 月曜始まりの週の初日 */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

export function fmtDateLong(d: Date): string {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${WEEK[d.getDay()]}）`;
}

export function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> 用の文字列 */
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${fmtTime(d)}`;
}

export function fromLocalInput(s: string): Date {
  return new Date(s);
}

export function overlaps(aStart: Date, aMin: number, bStart: Date, bMin: number): boolean {
  const a1 = aStart.getTime();
  const a2 = a1 + aMin * 60000;
  const b1 = bStart.getTime();
  const b2 = b1 + bMin * 60000;
  return a1 < b2 && b1 < a2;
}

export function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}
