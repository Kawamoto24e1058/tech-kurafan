/**
 * 各イベントに対応する通知を送るヘルパー集
 * DB からトークンを取得して push.ts に渡す
 */

import { db } from './db';
import { sendToTokens } from './push';

/** 全ユーザーのFCMトークンを取得して送信 */
async function notifyAll(payload: { title: string; body: string; url?: string }) {
  const tokens = await db.pushTokens.getAll();
  if (tokens.length === 0) return;
  const expired = await sendToTokens(tokens.map(t => t.token), payload);
  // 期限切れトークンをDBから削除
  await Promise.all(expired.map(t => db.pushTokens.remove(t)));
}

/** 特定ユーザーリストに送信 */
async function notifyUsers(uids: string[], payload: { title: string; body: string; url?: string }) {
  if (uids.length === 0) return;
  const allTokens = await db.pushTokens.getForUsers(uids);
  if (allTokens.length === 0) return;
  const expired = await sendToTokens(allTokens.map(t => t.token), payload);
  await Promise.all(expired.map(t => db.pushTokens.remove(t)));
}

// ─── 各イベント ────────────────────────────────────────────────────────────────

/** 新しい提案が投稿された */
export async function notifyItemCreated(itemId: string, title: string) {
  await notifyAll({
    title: '📢 新しい提案が届きました',
    body:  `「${title}」が追加されました。チェックしてみよう！`,
    url:   `/items/${itemId}`,
  });
}

/** 目標人数に達して成立した */
export async function notifyItemFunded(itemId: string, title: string, creatorId: string) {
  // 賛同者 + 作成者に通知
  const commits = await db.commitments.list(itemId);
  const uids = [...new Set([creatorId, ...commits.map(c => c.userId)])];
  await notifyUsers(uids, {
    title: '🎉 クラファンが成立しました！',
    body:  `「${title}」が目標人数を達成しました。支払いを進めましょう！`,
    url:   `/items/${itemId}`,
  });
}

/** 発注済みに変更された */
export async function notifyItemOrdered(itemId: string, title: string) {
  const commits = await db.commitments.list(itemId);
  const uids = commits.map(c => c.userId);
  await notifyUsers(uids, {
    title: '📦 発注されました',
    body:  `「${title}」が発注済みになりました。`,
    url:   `/items/${itemId}`,
  });
}

/** 期限切れで終了した（failed） */
export async function notifyItemFailed(itemId: string, title: string) {
  const commits = await db.commitments.list(itemId);
  const uids = commits.map(c => c.userId);
  if (uids.length === 0) return;
  await notifyUsers(uids, {
    title: '⏰ 募集が終了しました',
    body:  `「${title}」は目標人数に届かず終了しました。`,
    url:   `/items/${itemId}`,
  });
}

/** 締め切り24時間前リマインダー */
export async function notifyDeadlineApproaching(itemId: string, title: string) {
  const commits = await db.commitments.list(itemId);
  const uids = commits.map(c => c.userId);
  if (uids.length === 0) return;
  await notifyUsers(uids, {
    title: '⚡ 締め切りまで24時間！',
    body:  `「${title}」の締め切りが明日に迫っています。まだ未賛同の人に声をかけよう！`,
    url:   `/items/${itemId}`,
  });
}
