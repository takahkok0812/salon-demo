import { test as base, expect, type Page } from '@playwright/test';

/** 2026-11-25（水）10:00 に固定。サンプルデータはこの日を基準に作られる */
export const NOW = new Date('2026-11-25T10:00:00+09:00');

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await page.goto('./');
    await expect(page.getByText('今日の予約').first()).toBeVisible();
    await use(page);
  },
});

export { expect };

interface ApiBooking {
  id: string;
  staffId: string;
  menuId: string;
  start: string;
  minutes: number;
  status: string;
}

/** 擬似APIから予約一覧を取る（画面と同じAPIを使う） */
export async function fetchBookings(page: Page): Promise<ApiBooking[]> {
  return page.evaluate(async () => (await fetch('api/bookings')).json());
}

/** <input type="datetime-local"> に入れる文字列（ページと同じ日本時間で作る） */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const jst = new Date(d.getTime() + 9 * 3600_000);
  return `${jst.getUTCFullYear()}-${p(jst.getUTCMonth() + 1)}-${p(jst.getUTCDate())}T${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}`;
}

/** 担当者の空き枠（指定した分数が入る最初の枠）を、明日以降の営業日から探す */
export async function findFreeSlot(page: Page, staffId: string, minutes: number): Promise<Date> {
  const bookings = (await fetchBookings(page)).filter((b) => b.staffId === staffId && b.status !== 'cancelled');
  for (let d = 1; d <= 14; d++) {
    const day = new Date(NOW.getTime() + d * 86400_000);
    const dayJst = new Date(day.getTime() + 9 * 3600_000);
    if (dayJst.getUTCDay() === 2) continue; // 火曜定休
    for (let m = 10 * 60; m + minutes <= 20 * 60; m += 30) {
      const start = new Date(Date.UTC(dayJst.getUTCFullYear(), dayJst.getUTCMonth(), dayJst.getUTCDate()) + (m - 9 * 60) * 60_000);
      const end = start.getTime() + minutes * 60_000;
      const busy = bookings.some((b) => {
        const s = new Date(b.start).getTime();
        return s < end && start.getTime() < s + b.minutes * 60_000;
      });
      if (!busy) return start;
    }
  }
  throw new Error('空き枠が見つかりません');
}
