# サロン予約・顧客管理（デモ）

美容室・整体などの小さな店舗向けの、予約と顧客をまとめて管理するWebアプリのデモです。
データはすべて架空です。

**デモ：https://takahkok0812.github.io/salon-demo/** （右上で「管理者／スタッフ」を切り替えると表示が変わります）

## できること

- **ダッシュボード**：今日の予約、今週の予約件数、今月の売上、キャンセル率、フォロー候補（いつもの来店間隔を過ぎて次の予約がないお客様）
- **予約カレンダー**：週表示、担当者ごとの色分けと絞り込み、空き枠クリックで予約登録
  - 担当者の予約の重なり、定休日、営業時間外を登録時にチェック
- **顧客管理**：検索、来店履歴、接客メモ、CSVの書き出し・取り込み（数式インジェクション対策済み）
- **権限**：管理者／スタッフで表示を切り替え（スタッフは売上・金額を非表示、連絡先は一部伏せ字、CSV入出力と予約削除は不可）
- **AI機能**：来店履歴の要約、予約確認メッセージの下書き
  - デモ版はブラウザだけで動かすため定型文で代用。本番構成ではサーバー側から Claude API を呼び出します

## 技術

- React 19 / TypeScript / Vite
- 状態管理：useReducer + Context（ブラウザの localStorage に保存）
- 本番構成の想定：API Gateway + Lambda + DynamoDB（AWS SAM）、認証は Cognito または JWT

## 動かし方

```bash
npm install
npm run dev     # 開発サーバー
npm run build   # dist/index.html（1ファイル）を出力
```

## ファイル構成

```
src/
  App.tsx                 画面の枠・タブ・権限切り替え
  store.tsx               状態管理と保存
  types.ts                型定義
  data/seed.ts            架空のサンプルデータ
  lib/date.ts             日付・時刻の処理
  lib/ai.ts               AI機能（デモ版）
  lib/csv.ts              CSVの入出力
  components/
    DashboardView.tsx
    CalendarView.tsx
    BookingModal.tsx
    CustomersView.tsx
```
