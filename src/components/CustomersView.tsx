import { useMemo, useRef, useState } from 'react';
import type { Customer } from '../types';
import { STATUS_LABEL } from '../types';
import { newId, useStore } from '../store';
import { fmtDateLong, fmtTime, yen } from '../lib/date';
import { summarizeCustomer, visitStats } from '../lib/ai';
import { parseCsv, toCsv } from '../lib/csv';

interface Props {
  onToast: (message: string) => void;
}

function mask(s: string): string {
  return s.length <= 4 ? '****' : `${s.slice(0, 3)}****${s.slice(-2)}`;
}

export function CustomersView({ onToast }: Props) {
  const { state, dispatch } = useStore();
  const { data, role } = state;
  const isAdmin = role === 'admin';
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(data.customers[0]?.id ?? '');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [summary, setSummary] = useState('');
  const [csvText, setCsvText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const q = query.trim();
    return data.customers
      .filter((c) => !q || c.name.includes(q) || c.kana.includes(q) || c.phone.includes(q))
      .map((c) => ({ c, s: visitStats(data, c.id) }))
      .sort((a, b) => (b.s.last?.start ?? '').localeCompare(a.s.last?.start ?? ''));
  }, [data, query]);

  const selected = data.customers.find((c) => c.id === selectedId) ?? null;
  const history = selected
    ? data.bookings.filter((b) => b.customerId === selected.id).sort((a, b) => b.start.localeCompare(a.start))
    : [];

  function exportCsv() {
    const csv = toCsv([
      ['顧客ID', '氏名', 'フリガナ', '電話番号', 'メール', '来店回数', '最終来店日', 'メモ'],
      ...rows.map(({ c, s }) => [
        c.id, c.name, c.kana, c.phone, c.email, String(s.count),
        s.last ? fmtDateLong(new Date(s.last.start)) : '', c.note,
      ]),
    ]);
    setCsvText(csv);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const table = parseCsv(text.replace(/^﻿/, ''));
    const [head, ...body] = table;
    const idx = (name: string) => head.indexOf(name);
    if (idx('氏名') < 0) {
      onToast('「氏名」の列が見つかりませんでした');
      return;
    }
    const customers: Customer[] = body
      .filter((r) => r[idx('氏名')]?.trim())
      .map((r) => ({
        id: newId('c'),
        name: r[idx('氏名')].trim(),
        kana: idx('フリガナ') >= 0 ? r[idx('フリガナ')] ?? '' : '',
        phone: idx('電話番号') >= 0 ? r[idx('電話番号')] ?? '' : '',
        email: idx('メール') >= 0 ? r[idx('メール')] ?? '' : '',
        note: idx('メモ') >= 0 ? r[idx('メモ')] ?? '' : '',
        createdAt: new Date().toISOString(),
      }));
    dispatch({ type: 'importCustomers', customers });
    onToast(`${customers.length}件の顧客を取り込みました`);
  }

  function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim()) {
      onToast('氏名を入力してください');
      return;
    }
    dispatch({ type: 'saveCustomer', customer: { ...editing, name: editing.name.trim() } });
    setSelectedId(editing.id);
    setEditing(null);
    onToast('顧客情報を保存しました');
  }

  return (
    <section className="split">
      <div className="panel list">
        <div className="toolbar">
          <input className="search" placeholder="名前・カナ・電話番号で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button
            className="primary"
            onClick={() => setEditing({ id: newId('c'), name: '', kana: '', phone: '', email: '', note: '', createdAt: new Date().toISOString() })}
          >
            ＋ 新規
          </button>
        </div>
        {isAdmin ? (
          <div className="toolbar small">
            <button className="ghost" onClick={exportCsv}>CSV書き出し</button>
            <button className="ghost" onClick={() => fileRef.current?.click()}>CSV取り込み</button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <p className="hint">CSVの入出力は管理者のみ利用できます。</p>
        )}
        <ul className="rows">
          {rows.map(({ c, s }) => (
            <li key={c.id}>
              <button
                className={c.id === selectedId ? 'row on' : 'row'}
                onClick={() => {
                  setSelectedId(c.id);
                  setSummary('');
                }}
              >
                <span className="name">{c.name}</span>
                <span className="sub">
                  来店 {s.count}回 ・ 最終 {s.last ? fmtDateLong(new Date(s.last.start)) : '—'}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="empty">該当するお客様がいません</li>}
        </ul>
      </div>

      <div className="panel detail">
        {selected ? (
          <>
            <div className="detail-head">
              <div>
                <h2>{selected.name} 様</h2>
                <p className="sub">{selected.kana}</p>
              </div>
              <button className="ghost" onClick={() => setEditing({ ...selected })}>編集</button>
            </div>
            <dl className="info">
              <dt>電話</dt>
              <dd>{isAdmin ? selected.phone : mask(selected.phone)}</dd>
              <dt>メール</dt>
              <dd>{isAdmin ? selected.email : mask(selected.email)}</dd>
              <dt>接客メモ</dt>
              <dd>{selected.note || '—'}</dd>
            </dl>
            {!isAdmin && <p className="hint">スタッフ権限では、連絡先の一部を伏せて表示します。</p>}

            <div className="ai-box">
              <div className="ai-head">
                <span className="badge-ai">AI</span>
                <span>来店履歴の要約</span>
                <button className="ghost" onClick={() => setSummary(summarizeCustomer(data, selected, isAdmin))}>要約する</button>
              </div>
              {summary && <p className="summary">{summary}</p>}
            </div>

            <h3>予約・来店履歴</h3>
            <table className="history">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>メニュー</th>
                  <th>担当</th>
                  <th>状態</th>
                  {isAdmin && <th className="num">金額</th>}
                </tr>
              </thead>
              <tbody>
                {history.map((b) => {
                  const d = new Date(b.start);
                  const m = data.menus.find((x) => x.id === b.menuId);
                  return (
                    <tr key={b.id} className={b.status}>
                      <td>{fmtDateLong(d)} {fmtTime(d)}</td>
                      <td>{m?.name}</td>
                      <td>{data.staff.find((x) => x.id === b.staffId)?.name}</td>
                      <td>{STATUS_LABEL[b.status]}</td>
                      {isAdmin && <td className="num">{b.status === 'cancelled' ? '—' : yen(m?.price ?? 0)}</td>}
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="empty">まだ記録がありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty">左の一覧からお客様を選んでください</p>
        )}
      </div>

      {csvText && (
        <div className="overlay" onMouseDown={() => setCsvText('')}>
          <div className="modal" role="dialog" aria-label="CSV書き出し" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>CSV書き出し（{rows.length}件）</h2>
              <button className="icon" onClick={() => setCsvText('')} aria-label="閉じる">×</button>
            </div>
            <p className="hint">本番版ではファイルとしてダウンロードします。このデモでは内容をコピーして、表計算ソフトに貼り付けられます。</p>
            <textarea className="draft" rows={12} readOnly value={csvText} />
            <div className="modal-foot">
              <span className="spacer" />
              <button
                className="primary"
                onClick={() => {
                  navigator.clipboard?.writeText(csvText).then(
                    () => onToast('CSVをコピーしました'),
                    () => onToast('コピーできませんでした。テキストを選択してコピーしてください'),
                  );
                }}
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="overlay" onMouseDown={() => setEditing(null)}>
          <div className="modal" role="dialog" aria-label="顧客情報" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>顧客情報</h2>
              <button className="icon" onClick={() => setEditing(null)} aria-label="閉じる">×</button>
            </div>
            <div className="grid2">
              <label className="field"><span>氏名</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="field"><span>フリガナ</span>
                <input value={editing.kana} onChange={(e) => setEditing({ ...editing, kana: e.target.value })} />
              </label>
              <label className="field"><span>電話番号</span>
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
              <label className="field"><span>メール</span>
                <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>
            </div>
            <label className="field"><span>接客メモ</span>
              <textarea rows={3} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </label>
            <div className="modal-foot">
              <span className="spacer" />
              <button className="ghost" onClick={() => setEditing(null)}>キャンセル</button>
              <button className="primary" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
