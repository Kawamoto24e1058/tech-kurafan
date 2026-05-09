# デプロイ手順（Vercel × Firebase）

このアプリは **Firebase**（認証・DB）＋ **Vercel**（ホスティング）で動きます。  
1回だけセットアップすれば、あとは `git push` だけで自動デプロイされます。

---

## Step 1 — Firebase プロジェクトを作る

1. https://console.firebase.google.com にアクセス
2. **「プロジェクトを作成」** → 好きな名前をつける（例: `tech-club-crowdfund`）
3. Google アナリティクスは「有効にしない」で OK

---

## Step 2 — Firebase Authentication を有効にする

1. Firebase Console の左メニュー → **Authentication**
2. 「始める」をクリック
3. **「Sign-in method」タブ** → **「Google」** を有効化
4. プロジェクトのサポートメール（自分のGmailでOK）を設定して保存

---

## Step 3 — Firestore データベースを作る

1. 左メニュー → **Firestore Database**
2. 「データベースの作成」→ **「本番環境モードで開始」** → リージョンは `asia-northeast1`（東京）

### Firestore セキュリティルール

Firestore → 「ルール」タブで以下に書き換えて公開：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // items: 認証ユーザーなら読み書き可（commitments サブコレクションは除く）
    match /items/{itemId} {
      allow read, write: if request.auth != null;

      // commitments は open 中は一覧取得不可（個人分のみ取得可）
      match /commitments/{userId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

> **Note:** サーバー（Firebase Admin SDK）はセキュリティルールをバイパスするため、  
> SvelteKit のサーバー側ではルールに関係なく全データにアクセスできます。  
> 上のルールはクライアント直接アクセスを防ぐための保険です。

---

## Step 4 — サービスアカウントキーを取得する

1. Firebase Console → **プロジェクトの設定**（⚙️アイコン）
2. **「サービスアカウント」タブ** → **「新しい秘密鍵を生成」**
3. JSON ファイルをダウンロード（絶対に Git にコミットしないこと！）
4. JSON の中身を確認：
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`（改行は `\n` のまま1行で）

---

## Step 5 — Firebase クライアント設定を取得する

1. Firebase Console → **プロジェクトの設定**
2. 「マイアプリ」セクション → **「ウェブアプリを追加」**（`</>`アイコン）
3. アプリのニックネームをつけて登録
4. 表示された `firebaseConfig` の各値を控える：
   - `apiKey` → `PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `PUBLIC_FIREBASE_PROJECT_ID`

---

## Step 6 — Vercel にデプロイする

### 6-1. GitHub にプッシュ

```bash
cd テック部クラファン
git init
git add .
git commit -m "initial commit"
# GitHub で新しいリポジトリを作って push
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git push -u origin main
```

### 6-2. Vercel でプロジェクトを作る

1. https://vercel.com にアクセスしてサインアップ（GitHubアカウントでOK）
2. **「Add New Project」** → さっき作った GitHub リポジトリを選択
3. Framework Preset は **「SvelteKit」** が自動で選ばれる
4. **「Environment Variables」** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `FIREBASE_PROJECT_ID` | Firebase の project_id |
| `FIREBASE_CLIENT_EMAIL` | Firebase の client_email |
| `FIREBASE_PRIVATE_KEY` | Firebase の private_key（`"..."` ごとコピー） |
| `PUBLIC_FIREBASE_API_KEY` | Firebase の apiKey |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase の authDomain |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase の projectId |

5. **「Deploy」** をクリック → 1〜2分でデプロイ完了！

### 6-3. Firebase に Vercel のドメインを登録

Vercel のデプロイ後に発行される URL（例: `https://tech-club-crowdfund.vercel.app`）を Firebase に登録します。

1. Firebase Console → Authentication → **「Settings」タブ**
2. **「承認済みドメイン」** → Vercel の URL を追加

---

## ローカル開発（引き続き npm run dev で動かす）

`.env.example` をコピーして `.env.local` を作り、実際の値を入力：

```bash
cp .env.example .env.local
# .env.local を編集して Firebase の値を入力
npm install
npm run dev
```

---

## よくある質問

**Q. 画像の最大サイズが500KBに変わったのはなぜ？**  
A. Firestore の1ドキュメント上限が1MB のため。画像をそのまま Firestore に保存しています。  
　 より大きな画像が必要な場合は Firebase Storage との連携に移行してください。

**Q. データはリセットされる？**  
A. Firestore に保存されるので、Vercel を再デプロイしてもデータは消えません。

**Q. 複数の部員が同時に使える？**  
A. はい。Firestore はリアルタイム対応で、トランザクション処理で競合も防いでいます。
