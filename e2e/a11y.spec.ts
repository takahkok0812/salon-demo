import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** WCAG 2.1 A/AA のルールで確認し、重大・深刻な指摘だけを失敗にする */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}（${v.impact}）: ${v.help} … ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

test.describe('アクセシビリティ（axe）', () => {
  test('ダッシュボード', async ({ app }) => {
    expect(await audit(app)).toEqual([]);
  });

  test('予約カレンダー', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    expect(await audit(app)).toEqual([]);
  });

  test('顧客管理', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    expect(await audit(app)).toEqual([]);
  });

  test('予約の登録ダイアログ', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    await expect(app.getByRole('dialog', { name: '予約の編集' })).toBeVisible();
    expect(await audit(app)).toEqual([]);
  });

  test('顧客情報ダイアログ（エラー表示中）', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    await app.getByRole('button', { name: '＋ 新規' }).click();
    await app.getByRole('dialog', { name: '顧客情報' }).getByRole('button', { name: '保存' }).click();
    await expect(app.getByText('氏名を入力してください')).toBeVisible();
    expect(await audit(app)).toEqual([]);
  });
});

test.describe('キーボード操作', () => {
  test('ダイアログを開くと入力欄にフォーカスが移り、Esc で閉じると元のボタンに戻る', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    const opener = app.getByRole('button', { name: '＋ 予約を登録' });
    await opener.focus();
    await app.keyboard.press('Enter');
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByPlaceholder('名前・カナ・電話番号で検索')).toBeFocused();

    await app.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test('Tab キーのフォーカスがダイアログの外に出ない', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    await app.getByRole('button', { name: '＋ 新規' }).click();
    const dialog = app.getByRole('dialog', { name: '顧客情報' });
    for (let i = 0; i < 12; i++) {
      await app.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
  });
});
