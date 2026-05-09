import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) throw error(401, 'ログインが必要です');

  const item = await db.items.get(params.id);
  if (!item) throw error(404, 'アイテムが見つかりません');
  if (item.creatorId !== user.uid) throw error(403, '編集できるのは作成者のみです');
  if (item.status !== 'open')      throw error(400, '募集終了後は編集できません');

  return {
    item: {
      id:          item.id,
      title:       item.title,
      description: item.description,
      imageURL:    item.imageURL,
      totalCost:   item.totalCost,
      targetCount: item.targetCount,
      deadline:    item.deadline.toISOString().slice(0, 16),
    },
  };
};

export const actions: Actions = {
  default: async ({ params, request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'ログインが必要です' });

    const item = await db.items.get(params.id);
    if (!item) return fail(404, { message: 'アイテムが存在しません' });
    if (item.creatorId !== user.uid) return fail(403, { message: '権限がありません' });
    if (item.status !== 'open')      return fail(400, { message: '募集終了後は編集できません' });

    const data        = await request.formData();
    const title       = (data.get('title')       as string | null)?.trim() ?? '';
    const description = (data.get('description') as string | null)?.trim() ?? '';
    const totalCost   = parseInt(data.get('totalCost')  as string, 10);
    const minCount    = parseInt(data.get('minCount')   as string, 10);
    const deadlineStr = data.get('deadline') as string | null;
    const clearImage  = data.get('clearImage') === 'true';

    // ── 画像処理 ─────────────────────────────────────────────────
    let imageURL = item.imageURL;

    if (clearImage) {
      imageURL = null;
    } else {
      const imageFile = data.get('image');
      if (imageFile && typeof imageFile !== 'string' && (imageFile as File).size > 0) {
        const file = imageFile as File;
        if (file.size > 500 * 1024) {
          return fail(400, {
            errors: { image: '画像は500KB以下にしてください' },
            values: { title, description, totalCost, minCount, deadline: deadlineStr },
          });
        }
        const bytes  = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        imageURL = `data:${file.type};base64,${base64}`;
      }
    }

    // ── バリデーション ────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (!title)                             errors.title       = 'アイテム名を入力してください';
    if (!description)                       errors.description = '説明を入力してください';
    if (isNaN(totalCost) || totalCost <= 0) errors.totalCost   = '正しい金額を入力してください';
    if (isNaN(minCount)  || minCount < 2)   errors.minCount    = '2人以上で設定してください';
    if (!deadlineStr)                       errors.deadline    = '締め切りを設定してください';

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        errors,
        values: { title, description, totalCost, minCount, deadline: deadlineStr },
      });
    }

    await db.items.update(params.id, {
      title,
      description,
      imageURL,
      totalCost,
      targetCount: minCount,
      deadline:    new Date(deadlineStr!),
    });

    redirect(303, `/items/${params.id}`);
  },
};
