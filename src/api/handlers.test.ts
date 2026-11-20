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
  const b = list.find((x) => x.status === 'reserved');
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

describe('顧客API', () => {
  it('氏名が空の登録は 422', async () => {
    const res = await call('customers', { method: 'POST', body: { name: ' ', kana: '', phone: '', email: '', note: '' } });
    expect(res.status).toBe(422);
  });

  it('CSV取り込みはスタッフ権限では 403', async () => {
    const res = await call('customers/import', { method: 'POST', role: 'staff', body: [{ name: 'テスト', kana: '', phone: '', email: '', note: '' }] });
    expect(res.status).toBe(403);
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
