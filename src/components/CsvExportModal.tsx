import { useDialog } from '../hooks/useDialog';

interface Props {
  csv: string;
  count: number;
  onClose: () => void;
  onToast: (message: string) => void;
}

/** CSV をファイルとして保存する。Excel で文字化けしないよう、先頭に BOM を付ける */
function download(csv: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvExportModal({ csv, count, onClose, onToast }: Props) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label="CSV書き出し" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>CSV書き出し（{count}件）</h2>
          <button className="icon" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <p className="hint">ダウンロードしたファイルは、Excel でそのまま開けます（文字化けしないよう BOM 付きの UTF-8 で保存します）。</p>
        <textarea className="draft" rows={12} readOnly value={csv} aria-label="CSVの内容" />
        <div className="modal-foot">
          <span className="spacer" />
          <button
            className="ghost"
            onClick={() => {
              navigator.clipboard?.writeText(csv).then(
                () => onToast('CSVをコピーしました'),
                () => onToast('コピーできませんでした。テキストを選択してコピーしてください'),
              );
            }}
          >
            コピー
          </button>
          <button className="primary" onClick={() => download(csv)}>
            ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}
