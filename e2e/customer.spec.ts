import { expect, test } from './fixtures.ts';

test.describe('顧客管理', () => {
  test('入力に誤りがあると項目ごとにエラーを出し、直すと登録できる。再読み込みしても残る', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    await app.getByRole('button', { name: '＋ 新規' }).click();
    const dialog = app.getByRole('dialog', { name: '顧客情報' });

    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog.getByText('氏名を入力してください')).toBeVisible();

    await dialog.getByLabel('氏名').fill('E2E 花子');
    await dialog.getByLabel('フリガナ').fill('いーつーいー');
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog.getByText('フリガナはカタカナで入力してください')).toBeVisible();

    await dialog.getByLabel('フリガナ').fill('イーツーイー ハナコ');
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(app.getByRole('status').filter({ hasText: '顧客情報を保存しました' })).toBeVisible();

    await app.reload();
    await app.getByRole('button', { name: '顧客管理' }).click();
    await expect(app.getByRole('button', { name: /E2E 花子/ })).toBeVisible();
  });
});

test.describe('CSV書き出し', () => {
  test('Excel で開ける CSV ファイルとしてダウンロードできる（BOM 付き）', async ({ app }) => {
    await app.getByRole('button', { name: '顧客管理' }).click();
    await app.getByRole('button', { name: 'CSV書き出し' }).click();
    const [download] = await Promise.all([
      app.waitForEvent('download'),
      app.getByRole('dialog', { name: 'CSV書き出し' }).getByRole('button', { name: 'ダウンロード' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^customers-\d{8}\.csv$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const buf = Buffer.concat(chunks);
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(buf.toString('utf8')).toContain('氏名');
  });
});
