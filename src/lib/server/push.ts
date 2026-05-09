/**
 * FCM（Firebase Cloud Messaging）でプッシュ通知を送信するユーティリティ
 * firebase-admin/messaging を使用（Admin SDK 経由）
 */

import { isFirebaseConfigured } from './firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** FCMトークン1件に通知を送る。expired なら 'expired' を返す */
async function sendToToken(token: string, payload: PushPayload): Promise<boolean | 'expired'> {
  if (!isFirebaseConfigured) return false;

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    await getMessaging().send({
      token,
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      webpush: {
        fcmOptions: { link: payload.url ?? '/' },
        notification: {
          title: payload.title,
          body:  payload.body,
          icon:  '/favicon.png',
        },
      },
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    // トークン無効・期限切れ
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      return 'expired';
    }
    console.error('[push] sendToToken error:', code, err);
    return false;
  }
}

/** 複数トークンに送信。expired なトークンのリストを返す */
export async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<string[]> {
  if (!isFirebaseConfigured || tokens.length === 0) return [];

  const expiredTokens: string[] = [];

  await Promise.allSettled(
    tokens.map(async (token) => {
      const result = await sendToToken(token, payload);
      if (result === 'expired') expiredTokens.push(token);
    }),
  );

  return expiredTokens;
}
