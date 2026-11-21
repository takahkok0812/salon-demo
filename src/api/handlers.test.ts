import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import type { Booking } from '../types';
import { handlers } from './handlers';
import { resetDb } from './db';
import { ROLE_HEADER } from './types';

const server = setupServer(...handlers);
const BASE = 'http://localhost/api';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
});

function call(path: string, init: { method?: string; body?: unknown; role?: 'admin' | 'staff' } = {}) {
  return fetch(`${BASE}/${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', [ROLE_HEADER]: init.role ?? 'admin' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function anActiveBooking(): Promise<Booking> {
  const list = (await (await call('bookings')).json()) as Booking[];
  const b = list.find((x) => x.status === 'reserved' && new Date(x.start).getTime() > Date.now());
  if (!b) throw new Error('サンプルデータに予約中の予約がありません');
  return b;
}

describe('予約API', () => {
  it('同じ担当者・同じ時間の予約は 422 で断る（画面と同じルールをサーバー側でも確認）', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    const res = await call('bookings', { method: 'POST', body: existing });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('overlap');
  });

  it('問題のない予約は 201 で登録され、サーバーが id を採番する', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    const res = await call('bookings', { method: 'POST', body: { ...existing, status: 'cancelled' } });
    expect(res.status).toBe(201);
    const created = (await res.json()) as Booking;
    expect(created.id).toMatch(/^b/);
    const list = (await (await call('bookings')).json()) as Booking[];
    expect(list.some((b) => b.id === created.id)).toBe(true);
  });

  it('存在しない予約の更新は 404', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    expect((await call('bookings/nope', { method: 'PUT', body: existing })).status).toBe(404);
  });

  it('予約の削除はスタッフ権限では 403、管理者なら 204', async () => {
    const b = await anActiveBooking();
    expect((await call(`bookings/${b.id}`, { method: 'DELETE', role: 'staff' })).status).toBe(403);
    expect((await call(`bookings/${b.id}`, { method: 'DELETE', role: 'admin' })).status).toBe(204);
  });
});

describe('予約API：ルールのすり抜けを防ぐ', () => {
  it('所要時間は送られてきた値ではなくメニューから決める（短く偽って重なりチェックを通せない）', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    const res = await call('bookings', { method: 'POST', body: { ...existing, minutes: 1 } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('overlap');
  });

  it('存在しないお客様の予約は 422', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    const res = await call('bookings', { method: 'POST', body: { ...existing, customerId: 'nope', status: 'cancelled' } });
    expect(res.status).toBe(422);
  });

  it('過去の日時に新しい予約は登録できない', async () => {
    const { id: _id, ...existing } = await anActiveBooking();
    const past = new Date(Date.now() - 7 * 86400_000).toISOString();
    const res = await call('bookings', { method: 'POST', body: { ...existing, start: past, status: 'cancelled' } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('past');
  });

  it('キャンセルした予約の枠に別の予約が入ったあと、元の予約を「予約」に戻すと 422', async () => {
    const b = await anActiveBooking();
    expect((await call(`bookings/${b.id}/status`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    const { id: _id, ...same } = b;
    expect((await call('bookings', { method: 'POST', body: same })).status).toBe(201);
    const res = await call(`bookings/${b.id}/status`, { method: 'PATCH', body: { status: 'reserved' } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('overlap');
  });
});

describe('顧客API：権限', () => {
  it('スタッフには連絡先を伏せ字で返す（管理者にはそのまま）', async () => {
    const admin = (await (await call('customers')).json()) as { id: string; phone: string; email: string }[];
    const staff = (await (await call('customers', { role: 'staff' })).json()) as typeof admin;
    const a = admin.find((c) => c.phone)!;
    const s = staff.find((c) => c.id === a.id)!;
    expect(s.phone).not.toBe(a.phone);
    expect(s.phone).toContain('****');
    expect(s.email).toContain('****');
  });

  it('スタッフが顧客を更新しても、連絡先は変わらない', async () => {
    const admin = (await (await call('customers')).json()) as { id: string; name: string; kana: string; phone: string; email: string; note: string }[];
    const c = admin.find((x) => x.phone)!;
    const res = await call(`customers/${c.id}`, { method: 'PUT', role: 'staff', body: { ...c, phone: '', email: '', note: 'スタッフが追記' } });
    expect(res.status).toBe(200);
    const after = ((await (await call('customers')).json()) as typeof admin).find((x) => x.id === c.id)!;
    expect(after.phone).toBe(c.phone);
    expect(after.email).toBe(c.email);
    expect(after.note).toBe('スタッフが追記');
  });
});

describe('顧客API', () => {
  it('氏名が空の登録は 422', async () => {
    const res = await call('customers', { method: 'POST', body: { name: ' ', kana: '', phone: '', email: '', note: '' } });
    expect(res.status).toBe(422);
  });

  it('CSV取り込みはスタッフ権限では 403', async () => {
    const res = await call('customers/import', { method: 'POST', role: 'staff', body: [{ name: 'テスト', kana: '', phone: '', email: '', note: '' }] });
    expect(res.status).toBe(403);
  });

  it('フリガナがカタカナでなければ、画面と同じメッセージで 422', async () => {
    const res = await call('customers', { method: 'POST', body: { name: '山田', kana: 'やまだ', phone: '', email: '', note: '' } });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { message: string }).message).toBe('フリガナはカタカナで入力してください');
  });

  it('CSV取り込みで形式の合わない行があれば、CSVの何行目かを返して1件も取り込まない', async () => {
    const before = ((await (await call('customers')).json()) as unknown[]).length;
    const res = await call('customers/import', {
      method: 'POST',
      body: [
        { name: '正しい 行', kana: '', phone: '', email: '', note: '' },
        { name: '誤り 行', kana: '', phone: '', email: 'not-an-email', note: '' },
      ],
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { message: string }).message).toMatch(/^3行目：/);
    expect(((await (await call('customers')).json()) as unknown[]).length).toBe(before);
  });

  it('CSV取り込みは氏名のある行だけを登録する', async () => {
    const res = await call('customers/import', {
      method: 'POST',
      body: [
        { name: '新規 太郎', kana: '', phone: '', email: '', note: '' },
        { name: '', kana: '', phone: '', email: '', note: '' },
      ],
    });
    expect(await res.json()).toEqual({ imported: 1 });
  });
});
