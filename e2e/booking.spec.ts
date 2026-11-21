import { expect, fetchBookings, findFreeSlot, test, toLocalInput } from './fixtures.ts';

test.describe('予約の登録', () => {
  test('担当者の空き枠に予約を登録できる', async ({ app }) => {
    const start = await findFreeSlot(app, 's1', 60);
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await dialog.locator('select[name="customerId"]').selectOption({ index: 0 });
    await dialog.locator('select[name="staffId"]').selectOption('s1');
    await dialog.locator('select[name="menuId"]').selectOption('m1'); // カット 60分
    await dialog.locator('input[name="start"]').fill(toLocalInput(start));
    await dialog.getByRole('button', { name: '保存' }).click();

    await expect(app.getByRole('status').filter({ hasText: '予約を登録しました' })).toBeVisible();
    const saved = (await fetchBookings(app)).find((b) => b.staffId === 's1' && new Date(b.start).getTime() === start.getTime());
    expect(saved?.status).toBe('reserved');
  });

  test('担当者の予約が重なる時間は登録できない', async ({ app }) => {
    const existing = (await fetchBookings(app)).find((b) => b.status === 'reserved');
    if (!existing) throw new Error('予約中の予約がありません');
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await dialog.locator('select[name="customerId"]').selectOption({ index: 0 });
    await dialog.locator('select[name="staffId"]').selectOption(existing.staffId);
    await dialog.locator('input[name="start"]').fill(toLocalInput(new Date(existing.start)));
    await dialog.getByRole('button', { name: '保存' }).click();

    await expect(dialog.getByText(/担当者の予約が重なっています/)).toBeVisible();
    await expect(dialog.locator('input[name="start"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('定休日（火曜）は登録できない', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await dialog.locator('select[name="customerId"]').selectOption({ index: 0 });
    await dialog.locator('input[name="start"]').fill('2026-12-01T13:00');
    await dialog.getByRole('button', { name: '保存' }).click();

    await expect(dialog.getByText('火曜日は定休日です。')).toBeVisible();
  });
});

test.describe('入力途中で閉じるとき', () => {
  test('入力した内容があれば確認し、キャンセルすれば閉じない', async ({ app }) => {
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.getByRole('button', { name: '＋ 予約を登録' }).click();
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await dialog.locator('textarea[name="memo"]').fill('カラーの相談あり');

    app.once('dialog', (d) => d.dismiss());
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toBeVisible();

    app.once('dialog', (d) => d.accept());
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toHaveCount(0);
  });
});
