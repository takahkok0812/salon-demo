import type { AppData } from '../types';
import { createSeed } from '../data/seed';

/**
 * 擬似APIの保存先（サーバー側のデータベースの代わり）。
 * ブラウザでは localStorage に保存し、テストなど localStorage がない環境ではメモリだけで持つ。
 */
const KEY = 'salon-demo-db-v2';

/**
 * サンプルデータは「作った日」を基準に並ぶので、作った日も一緒に保存する。
 * 別の日に開いたときは作り直す（数日後に開くと「今日の予約」が空になるのを防ぐ）。
 */
interface Stored {
  seededOn: string;
  data: AppData;
}

let data: AppData | null = null;
let seededOn = '';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** 端末の日付（YYYY-MM-DD） */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function load(): AppData {
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Stored;
        if (stored.seededOn === todayKey() && stored.data?.bookings) {
          seededOn = stored.seededOn;
          return stored.data;
        }
      }
    } catch {
      // 壊れたデータはサンプルデータに置き換える
    }
  }
  seededOn = todayKey();
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
    storage()?.setItem(KEY, JSON.stringify({ seededOn: seededOn || todayKey(), data: next } satisfies Stored));
  } catch {
    // 保存できなくてもメモリ上のデータで動き続ける
  }
}

export function resetDb(): AppData {
  seededOn = todayKey();
  const seed = createSeed();
  commit(seed);
  return seed;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
