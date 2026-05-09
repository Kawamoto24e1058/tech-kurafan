import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifyItemCreated } from '$lib/server/notifications';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'ログインが必要です' });

    const data = await request.formData();

    const title       = (data.get('title')       as string | null)?.trim() ?? '';
    const description = (data.get('description') as string | null)?.trim() ?? '';
    const totalCost   = parseInt(data.get('totalCost')   as string, 10);
    const minCount    = parseInt(data.get('minCount')    as string, 10);
    const deadlineStr = data.get('deadline') as string | null;

    // ── 画像処理（Firestore の 1MB 制限に合わせて 500KB まで）────────────
    let imageURL: string | null = null;
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

    // ── アイテム作成 & 自動賛同 ───────────────────────────────────
    const id = await db.items.create({
      title,
      description,
      imageURL,
      totalCost,
      targetCount: minCount,
      status:      'open',
      deadline:    new Date(deadlineStr!),
      creatorId:   user.uid,
    });

    await db.commitments.create(id, user.uid, {
      displayName: user.displayName,
      photoURL:    user.photoURL,
    });

    // 全員に通知（非同期・失敗しても続行）
    notifyItemCreated(id, title).catch(console.error);

    redirect(303, `/items/${id}`);
  },
};
