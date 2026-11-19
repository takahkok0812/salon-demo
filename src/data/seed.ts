import type { AppData, Booking, Customer, Menu, Staff } from '../types';
import { addDays, CLOSE_HOUR, OPEN_HOUR, startOfDay, startOfWeek } from '../lib/date';

// すべて架空のデータです（実在の人物・店舗とは関係ありません）

const staff: Staff[] = [
  { id: 's1', name: '佐々木', color: '#3b6fd8' },
  { id: 's2', name: '森', color: '#2e9e7a' },
  { id: 's3', name: '小林', color: '#c7782f' },
];

const menus: Menu[] = [
  { id: 'm1', name: 'カット', minutes: 60, price: 4400 },
  { id: 'm2', name: 'カット＋カラー', minutes: 120, price: 9900 },
  { id: 'm3', name: 'パーマ', minutes: 120, price: 8800 },
  { id: 'm4', name: 'ヘッドスパ', minutes: 30, price: 3300 },
  { id: 'm5', name: 'トリートメント', minutes: 30, price: 2750 },
];

const names: [string, string][] = [
  ['山田 花子', 'ヤマダ ハナコ'],
  ['田中 一郎', 'タナカ イチロウ'],
  ['鈴木 美咲', 'スズキ ミサキ'],
  ['高橋 健太', 'タカハシ ケンタ'],
  ['伊藤 さくら', 'イトウ サクラ'],
  ['渡辺 翔', 'ワタナベ ショウ'],
  ['中村 由美', 'ナカムラ ユミ'],
  ['小川 大輔', 'オガワ ダイスケ'],
  ['加藤 結衣', 'カトウ ユイ'],
  ['吉田 拓海', 'ヨシダ タクミ'],
  ['松本 彩', 'マツモト アヤ'],
  ['井上 誠', 'イノウエ マコト'],
];

const notes = [
  '前髪は短めが好み。頭皮が乾燥しやすい。',
  '仕事柄、明るすぎるカラーは不可。',
  '毎回ヘッドスパを追加。肩こりがひどい。',
  'くせ毛。湿気の多い時期はパーマ相談あり。',
  '',
  'お子様連れで来店することがある。',
  'ブリーチ経験あり。ダメージケアを希望。',
  '',
  '平日夕方の来店が多い。',
  '短時間で済ませたい。',
  'カラーで頭皮がしみやすい。',
  '',
];

/** 決まった並びの乱数（毎回同じデータになるように） */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function createSeed(today = new Date()): AppData {
  const r = rng(20261119);
  const customers: Customer[] = names.map(([name, kana], i) => ({
    id: `c${i + 1}`,
    name,
    kana,
    phone: `090-0000-${String(1001 + i).padStart(4, '0')}`,
    email: `customer${i + 1}@example.com`,
    note: notes[i],
    createdAt: addDays(startOfDay(today), -200 + i * 7).toISOString(),
  }));

  const bookings: Booking[] = [];
  let id = 1;
  const push = (b: Omit<Booking, 'id'>) => bookings.push({ ...b, id: `b${id++}` });

  // 過去3か月の来店履歴
  for (let back = 90; back >= 1; back -= 1) {
    const day = addDays(startOfDay(today), -back);
    if (day.getDay() === 2) continue; // 火曜定休
    const count = Math.floor(r() * 3);
    for (let k = 0; k < count; k++) {
      const menu = menus[Math.floor(r() * menus.length)];
      const hour = OPEN_HOUR + Math.floor(r() * (CLOSE_HOUR - OPEN_HOUR - 2));
      const start = new Date(day);
      start.setHours(hour, r() < 0.5 ? 0 : 30);
      push({
        customerId: customers[Math.floor(r() * customers.length)].id,
        staffId: staff[k % staff.length].id,
        menuId: menu.id,
        start: start.toISOString(),
        minutes: menu.minutes,
        status: r() < 0.08 ? 'cancelled' : 'visited',
        memo: '',
      });
    }
  }

  // 今週・来週の予約（スタッフごとに重ならないように配置）
  const week = startOfWeek(today);
  // 架空の新規客（来店履歴なし）を予約枠に回して、既存客の予約が多くなりすぎないようにする
  const walkIns = ['青木 恵', '石川 亮', '森田 香織', '前田 悠', '藤井 千夏', '岡田 翼', '長谷川 舞', '村上 陸', '近藤 真央', '坂本 樹'];
  walkIns.forEach((name, i) =>
    customers.push({
      id: `c${names.length + i + 1}`,
      name,
      kana: '',
      phone: `080-0000-${String(2001 + i).padStart(4, '0')}`,
      email: `guest${i + 1}@example.com`,
      note: '',
      createdAt: addDays(startOfDay(today), -3).toISOString(),
    }),
  );
  const futureCount = new Map<string, number>();
  const pickFuture = () => {
    // 既存客（末尾3名を除く）は先の予約を2件まで。それ以外は新規客から選ぶ
    for (let t = 0; t < 4; t++) {
      const c = customers[Math.floor(r() * (names.length - 3))];
      if ((futureCount.get(c.id) ?? 0) < 2) {
        futureCount.set(c.id, (futureCount.get(c.id) ?? 0) + 1);
        return c.id;
      }
    }
    return customers[names.length + Math.floor(r() * walkIns.length)].id;
  };
  for (let d = 0; d < 14; d++) {
    const day = addDays(week, d);
    if (day.getDay() === 2) continue;
    staff.forEach((s, si) => {
      let cursor = OPEN_HOUR * 60 + si * 30;
      while (cursor < (CLOSE_HOUR - 1) * 60) {
        if (r() < 0.45) {
          const menu = menus[Math.floor(r() * menus.length)];
          if (cursor + menu.minutes > CLOSE_HOUR * 60) break;
          const start = new Date(day);
          start.setHours(0, cursor);
          const past = start.getTime() < today.getTime();
          push({
            // 末尾3名は先の予約を入れない（フォロー候補の例として表示するため）
            customerId: pickFuture(),
            staffId: s.id,
            menuId: menu.id,
            start: start.toISOString(),
            minutes: menu.minutes,
            status: past ? 'visited' : 'reserved',
            memo: r() < 0.25 ? 'Web予約。初回クーポン利用。' : '',
          });
          cursor += menu.minutes + 30;
        } else {
          cursor += 60;
        }
      }
    });
  }

  return { staff, menus, customers, bookings };
}
