import type { AppData } from '../types';
import { createSeed } from '../data/seed';

/**
 * 擬似APIの保存先（サーバー側のデータベースの代わり）。
 * ブラウザでは localStorage に保存し、テストなど localStorage がない環境ではメモリだけで持つ。
 */
const KEY = 'salon-demo-db-v1';
const LEGACY_KEY = 'salon-demo-v2'; // 擬似API導入前のデータ（画面が直接保存していた形式）

let data: AppData | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function load(): AppData {
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(KEY);
      if (raw) return JSON.parse(raw) as AppData;
      const legacy = s.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as { data?: AppData };
        if (parsed.data?.bookings) return parsed.data;
      }
    } catch {
      // 壊れたデータはサンプルデータに置き換える
    }
  }
  return createSeed();
}

export function db(): AppData {
  data ??= load();
  return data;
}

/** 変更を保存する。呼び出し側で db() の中身を書き換えてから呼ぶ */
export function commit(next: AppData): void {
  data = next;
  try {
    storage()?.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できなくてもメモリ上のデータで動き続ける
  }
}

export function resetDb(): AppData {
  const seed = createSeed();
  commit(seed);
  return seed;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
