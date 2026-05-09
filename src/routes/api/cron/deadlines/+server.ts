/**
 * Vercel Cron Job エンドポイント
 * 毎日 JST 9:00（UTC 0:00）に実行
 * - 期限切れアイテムを failed にして通知
 * - 締め切り24時間前アイテムにリマインダー通知
 */

import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifyItemFailed, notifyDeadlineApproaching } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

// Vercel Cron は Authorization: Bearer <CRON_SECRET> を付けて呼ぶ
const CRON_SECRET = process.env.CRON_SECRET ?? '';

export const GET: RequestHandler = async ({ request }) => {
  // セキュリティチェック（本番 Vercel から来た場合のみ許可）
  const auth = request.headers.get('authorization') ?? '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 全 open アイテムを取得
  const openItems = await db.items.list({ status: 'open' });

  let failedCount = 0;
  let reminderCount = 0;

  for (const item of openItems) {
    const deadline = new Date(item.deadline);

    if (deadline <= now) {
      // 期限切れ → failed に更新して通知
      await db.items.update(item.id, { status: 'failed' });
      await notifyItemFailed(item.id, item.title).catch(console.error);
      failedCount++;
    } else if (deadline <= in24h) {
      // 24時間以内に締め切り → リマインダー通知
      await notifyDeadlineApproaching(item.id, item.title).catch(console.error);
      reminderCount++;
    }
  }

  return json({ ok: true, failedCount, reminderCount, checkedAt: now.toISOString() });
};
