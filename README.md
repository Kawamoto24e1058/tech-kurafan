# テック部クラファン

テック部内で使う共同購入（割り勘）管理PWAです。

## ローカルで動かす手順

```bash
# 1. このフォルダに移動
cd テック部クラファン

# 2. 依存パッケージをインストール
npm install

# 3. 型ファイルを生成（初回のみ）
npm run check

# 4. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:5173 を開けば動きます。

## 現在の状態

- Firebase は **未接続**（インメモリのモックDBで動作）
- ログインも固定ユーザー（田中 健太）でモック済み
- サーバーを再起動するとデータはリセットされます

## Firebase に接続する場合

1. Firebase プロジェクトを作成
2. `src/lib/server/db.ts` を Firebase Admin SDK に差し替え
3. `src/hooks.server.ts` を Firebase Auth の検証ロジックに差し替え
4. `firestore.rules` をデプロイ

## 画面一覧

| URL | 画面 |
|---|---|
| `/` | アイテム一覧（ホーム） |
| `/items/new` | アイテム提案フォーム |
| `/items/:id` | アイテム詳細・賛同・支払い状況 |
| `/items/:id/edit` | アイテム編集（作成者のみ） |
