import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('toCsv', () => {
  it.each(['=1+1', '+81', '-5', '@SUM(A1)'])('数式として解釈される先頭文字をエスケープする: %s', (v) => {
    expect(toCsv([[v]])).toBe(`"'${v}"`);
  });

  it('ダブルクォートを二重にする', () => {
    expect(toCsv([['彼は"OK"と言った']])).toBe('"彼は""OK""と言った"');
  });

  it('行は CRLF で区切る', () => {
    expect(toCsv([['a'], ['b']])).toBe('"a"\r\n"b"');
  });
});

describe('parseCsv', () => {
  it('カンマ・改行・ダブルクォートを含むセルを読める', () => {
    const text = '氏名,メモ\r\n"山田, 花子","1行目\n2行目"\r\n"佐藤","""常連"""';
    expect(parseCsv(text)).toEqual([
      ['氏名', 'メモ'],
      ['山田, 花子', '1行目\n2行目'],
      ['佐藤', '"常連"'],
    ]);
  });

  it('書き出した内容を読み戻すと元の値になる（エスケープした先頭文字を除く）', () => {
    const rows = [['氏名', 'メモ'], ['田中', 'カンマ,と"引用符"']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
