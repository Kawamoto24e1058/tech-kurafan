# Firestore スキーマ設計
## テック部 共同購入（クラファン）PWA

---

## コレクション構造

```
users/{userId}
items/{itemId}
  └── commitments/{userId}
```

---

## `users/{userId}`

部員の基本プロフィール。Firebase Auth の UID をドキュメントIDとして使用。

| フィールド | 型 | 説明 |
|---|---|---|
| `displayName` | `string` | 表示名（実名推奨）|
| `email` | `string` | メールアドレス |
| `photoURL` | `string \| null` | アバター画像URL |
| `createdAt` | `Timestamp` | 登録日時 |

---

## `items/{itemId}`

募集中・確定済みの購入アイテム。ドキュメントIDは Firestore 自動生成。

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | `string` | アイテム名（例: "ミラーレスカメラ"）|
| `description` | `string` | 購入理由・詳細説明 |
| `imageURL` | `string \| null` | 商品画像URL |
| `totalCost` | `number` | 総額（円）|
| `targetCount` | `number` | 目標人数（割り勘の分母）|
| `currentCount` | `number` | 現在の参加人数 ⚠️ **クライアントに直接公開しない** |
| `heatLevel` | `number` | 熱量スコア 0〜4（後述）⚠️ **サーバーサイドで算出** |
| `status` | `ItemStatus` | `"open"` / `"funded"` / `"failed"` / `"ordered"` |
| `deadline` | `Timestamp` | 募集締め切り日時 |
| `creatorId` | `string` | 作成者の userId |
| `amountPerPerson` | `number \| null` | 確定後の1人あたり金額（`funded` 以降にセット）|
| `createdAt` | `Timestamp` | 作成日時 |
| `updatedAt` | `Timestamp` | 最終更新日時 |

### `status` の遷移

```
open ──(目標人数達成 or 締め切り前に手動確定)──► funded ──► ordered
  └──(締め切りまでに目標未達)──────────────────────────────► failed
```

### `heatLevel` の定義（ブラインド表示用）

`currentCount / targetCount` の割合をもとにサーバーサイド（Cloud Functions または SvelteKit のサーバーロード関数）で算出し、クライアントには「熱量レベル」のみ返す。

| レベル | 割合 | 表示ラベル | 演出 |
|---|---|---|---|
| `0` | 0% | 静寂… | グレー・静止 |
| `1` | 1〜33% | 小さな火花 | ブルー・低速パルス |
| `2` | 34〜66% | 熱気が高まっている | オレンジ・中速パルス |
| `3` | 67〜99% | 🔥 かなり熱い！ | レッド・高速パルス |
| `4` | 100% | ✅ 目標達成！ | グリーン・停止 |

> **設計意図**: `currentCount` を直接クライアントに返さないことで「傍観者効果」を防ぐ。  
> 参加者は正確な人数を知ることができず、「自分が参加しないと失敗するかも」という当事者意識が生まれる。

---

## `items/{itemId}/commitments/{userId}`

サブコレクション。ユーザーの「賛同（支払い合意）」レコード。ドキュメントIDは userId。

| フィールド | 型 | 説明 |
|---|---|---|
| `userId` | `string` | 参加者の userId |
| `displayName` | `string` | 参加者の表示名（非正規化・リスト表示高速化のため）|
| `photoURL` | `string \| null` | アバター（同上）|
| `status` | `CommitmentStatus` | `"committed"` / `"paid"` |
| `committedAt` | `Timestamp` | 賛同日時 |
| `paidAt` | `Timestamp \| null` | 支払い済みマーク日時 |

### 読み取り制限の設計

- **`status: "open"` の間**: サブコレクション全体の読み取りを禁止（Security Rules で制御）
  - クライアントは `items/{itemId}` の `heatLevel` フィールドのみ参照可能
  - 正確な `currentCount` も非公開
- **`status: "funded"` 以降**: サブコレクションの読み取りを許可
  - 実名・支払い状況が全員に公開される（心理的プレッシャー）

---

## Firestore Security Rules の方針

```javascript
// items コレクション
match /items/{itemId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  // currentCount, heatLevel の更新は Cloud Functions のみ許可
  allow update: if request.auth != null
    && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['status']) // クライアントからは status 変更のみ
    && request.auth.uid == resource.data.creatorId;

  // commitments サブコレクション
  match /commitments/{userId} {
    // 募集中は自分のドキュメントのみ読み取り可能
    allow read: if request.auth != null
      && (request.auth.uid == userId
          || get(/databases/$(database)/documents/items/$(itemId)).data.status != 'open');
    // 自分自身のコミットのみ作成・更新可能
    allow write: if request.auth != null && request.auth.uid == userId;
  }
}
```

> **補足**: `currentCount` のインクリメントと `heatLevel` の再計算は、  
> Firestore Triggers（Cloud Functions）を使って `commitments` のドキュメント作成時に自動実行することを推奨。  
> これにより、クライアントサイドの改ざんを防止できる。

---

## データフロー図

```
[ユーザーが「賛同」ボタンを押す]
        │
        ▼
commitments/{itemId}/{userId} を作成
        │
        ▼
[Cloud Functions Trigger: onCommitmentCreate]
        │
        ├── items/{itemId}.currentCount をインクリメント
        ├── heatLevel を再計算して更新
        └── currentCount >= targetCount なら
              ├── status を "funded" に変更
              └── amountPerPerson = totalCost / currentCount を計算・保存

[締め切りタイマー: Cloud Functions Scheduled]
        │
        └── deadline 超過 & status == "open" なら status を "failed" に変更
```

---

## インデックス設計（複合インデックス）

| コレクション | フィールド1 | フィールド2 | 用途 |
|---|---|---|---|
| `items` | `status` ASC | `deadline` ASC | 募集中アイテム一覧 |
| `items` | `status` ASC | `createdAt` DESC | 新着順一覧 |
| `items` | `creatorId` ASC | `createdAt` DESC | マイアイテム一覧 |
