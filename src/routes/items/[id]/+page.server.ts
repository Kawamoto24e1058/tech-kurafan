import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifyItemFunded, notifyItemOrdered } from '$lib/server/notifications';
import type { ItemView, CommitmentView } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) throw error(401, 'ログインが必要です');

  // 期限切れチェック
  await db.items.checkDeadlines();

  const item = await db.items.get(params.id);
  if (!item) throw error(404, 'アイテムが見つかりません');

  const itemView: ItemView = {
    id:              item.id,
    title:           item.title,
    description:     item.description,
    imageURL:        item.imageURL,
    totalCost:       item.totalCost,
    targetCount:     item.targetCount,
    heatLevel:       item.heatLevel,
    status:          item.status,
    deadline:        item.deadline,
    creatorId:       item.creatorId,
    amountPerPerson: item.amountPerPerson,
    createdAt:       item.createdAt,
    updatedAt:       item.updatedAt,
    myCommitment:    null,
  };

  const myCommit = await db.commitments.get(params.id, user.uid);
  if (myCommit) {
    itemView.myCommitment = {
      userId:      myCommit.userId,
      displayName: myCommit.displayName,
      photoURL:    myCommit.photoURL,
      status:      myCommit.status,
      committedAt: myCommit.committedAt,
      paidAt:      myCommit.paidAt,
    };
  }

  let commitments: CommitmentView[] = [];
  if (item.status === 'funded' || item.status === 'ordered') {
    const raw = await db.commitments.list(params.id);
    commitments = raw.map(c => ({
      userId:      c.userId,
      displayName: c.displayName,
      photoURL:    c.photoURL,
      status:      c.status,
      committedAt: c.committedAt,
      paidAt:      c.paidAt,
    }));
  }

  return {
    item:          itemView,
    commitments,
    currentUserId: user.uid,
    isAdmin:       locals.isAdmin,
  };
};

export const actions: Actions = {

  /** 賛同 */
  commit: async ({ params, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'ログインが必要です' });

    const item = await db.items.get(params.id);
    if (!item) return fail(404, { message: 'アイテムが存在しません' });
    if (item.status !== 'open') return fail(400, { message: '募集は終了しています' });

    const existing = await db.commitments.get(params.id, user.uid);
    if (existing) return fail(409, { message: 'すでに賛同済みです' });

    await db.commitments.create(params.id, user.uid, {
      displayName: user.displayName,
      photoURL:    user.photoURL,
    });

    // 賛同後にアイテムを再取得して funded になっていれば通知
    const updatedItem = await db.items.get(params.id);
    if (updatedItem?.status === 'funded') {
      notifyItemFunded(params.id, updatedItem.title, updatedItem.creatorId).catch(console.error);
    }

    return { success: true };
  },

  /** 支払い済みマーク */
  markPaid: async ({ params, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'ログインが必要です' });

    const c = await db.commitments.get(params.id, user.uid);
    if (!c) return fail(404, { message: 'コミットが見つかりません' });
    if (c.status === 'paid') return fail(409, { message: 'すでに支払い済みです' });

    await db.commitments.markPaid(params.id, user.uid);
    return { success: true };
  },

  /** 発注済みに進める（作成者 or 管理者） */
  markOrdered: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { message: 'ログインが必要です' });

    const item = await db.items.get(params.id);
    if (!item) return fail(404, { message: 'アイテムが存在しません' });

    const isAuthorized = locals.isAdmin || item.creatorId === locals.user.uid;
    if (!isAuthorized) return fail(403, { message: '権限がありません' });
    if (item.status !== 'funded') return fail(400, { message: '成立済みのアイテムのみ発注できます' });

    await db.items.update(params.id, { status: 'ordered' });
    notifyItemOrdered(params.id, item.title).catch(console.error);
    return { success: true };
  },

  /** アイテム削除（管理者 or 作成者・賛同者0のみ） */
  deleteItem: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { message: 'ログインが必要です' });

    const item = await db.items.get(params.id);
    if (!item) return fail(404, { message: 'アイテムが存在しません' });

    const isCreator = item.creatorId === locals.user.uid;
    if (!locals.isAdmin && !isCreator) return fail(403, { message: '権限がありません' });

    await db.items.delete(params.id);
    redirect(303, '/');
  },
};
