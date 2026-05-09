/**
 * Firebase Admin SDK 初期化（サーバー専用）
 * 環境変数が未設定のときは初期化をスキップします（ローカル開発モック用）。
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// dynamic/private を使うことでビルド時ではなく実行時に解決する
import { env } from '$env/dynamic/private';
const FIREBASE_PROJECT_ID  = env.FIREBASE_PROJECT_ID  ?? '';
const FIREBASE_CLIENT_EMAIL = env.FIREBASE_CLIENT_EMAIL ?? '';
const FIREBASE_PRIVATE_KEY  = env.FIREBASE_PRIVATE_KEY  ?? '';

export const isFirebaseConfigured =
  !!FIREBASE_PROJECT_ID && !!FIREBASE_CLIENT_EMAIL && !!FIREBASE_PRIVATE_KEY;

if (isFirebaseConfigured && !getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// Firebase 未設定の場合は null — db.ts と hooks.server.ts で分岐する
export const adminAuth = isFirebaseConfigured ? getAuth()       : null;
export const adminDb   = isFirebaseConfigured ? getFirestore()  : null;
