import { expect, test } from './fixtures.ts';

test.describe('権限', () => {
  test('スタッフ権限では、売上・予約の削除・CSV入出力が使えない', async ({ app }) => {
    await app.getByLabel('ログイン中の権限').selectOption('staff');

    await expect(app.getByText('今月の売上').locator('..')).toContainText('—');

    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.locator('button.booking').last().click({ force: true });
    const dialog = app.getByRole('dialog', { name: '予約の編集' });
    await expect(dialog.getByRole('button', { name: '保存' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '削除' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'キャンセル' }).click();

    await app.getByRole('button', { name: '顧客管理' }).click();
    await expect(app.getByText('CSVの入出力は管理者のみ利用できます。')).toBeVisible();
    await expect(app.getByRole('button', { name: 'CSV書き出し' })).toHaveCount(0);
  });

  test('管理者に戻すと削除ボタンが表示される', async ({ app }) => {
    await app.getByLabel('ログイン中の権限').selectOption('staff');
    await app.getByLabel('ログイン中の権限').selectOption('admin');
    await app.getByRole('button', { name: '予約カレンダー' }).click();
    await app.locator('button.booking').last().click({ force: true });
    await expect(app.getByRole('dialog', { name: '予約の編集' }).getByRole('button', { name: '削除' })).toBeVisible();
  });
});
