import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { ItemView } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw error(401, 'ログインが必要です');

  // 期限切れアイテムを自動的に failed に更新
  await db.items.checkDeadlines();

  function toView(item: Awaited<ReturnType<typeof db.items.list>>[0]): ItemView {
    return {
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
  }

  const all = await db.items.list();

  const openItems = all
    .filter(i => i.status === 'open')
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .map(toView);

  const activeItems = all
    .filter(i => i.status === 'funded' || i.status === 'ordered')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map(toView);

  const closedItems = all
    .filter(i => i.status === 'failed')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10)
    .map(toView);

  return {
    openItems,
    activeItems,
    closedItems,
    currentUserId:   locals.user.uid,
    currentUserName: locals.user.displayName,
    isAdmin:         locals.isAdmin,
  };
};
