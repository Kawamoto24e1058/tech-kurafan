/**
 * DB ラッパー（サーバー専用）
 * - FIREBASE_* 環境変数が設定されていれば → Firestore
 * - 未設定（ローカル開発）          → インメモリ モック
 */

import { adminDb, isFirebaseConfigured } from './firebase-admin';
import { calcHeatLevel } from '$lib/types';
import type { ItemStatus, HeatLevel } from '$lib/types';

// ─── 共通型 ──────────────────────────────────────────────────────────────────

export interface StoredItem {
  title: string;
  description: string;
  imageURL: string | null;
  totalCost: number;
  targetCount: number;
  currentCount: number;
  heatLevel: HeatLevel;
  status: ItemStatus;
  deadline: Date;
  creatorId: string;
  amountPerPerson: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CommitmentStatus = 'committed' | 'paid';

export interface StoredCommitment {
  userId: string;
  displayName: string;
  photoURL: string | null;
  status: CommitmentStatus;
  committedAt: Date;
  paidAt: Date | null;
}

export interface StoredUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ① インメモリ モック（ローカル開発用）
// ═══════════════════════════════════════════════════════════════════════════════

const _items      = new Map<string, StoredItem>();
const _commits    = new Map<string, Map<string, StoredCommitment>>();
const _users      = new Map<string, StoredUser>();
const _pushTokens = new Map<string, { uid: string; token: string }>();

function uid() { return Math.random().toString(36).slice(2, 10); }

const mockDb = {
  items: {
    async list(filter?: { status?: ItemStatus | ItemStatus[] }) {
      let all = [..._items.entries()].map(([id, item]) => ({ id, ...item }));
      if (filter?.status) {
        const s = Array.isArray(filter.status) ? filter.status : [filter.status];
        all = all.filter(i => s.includes(i.status));
      }
      return all;
    },
    async get(id: string) {
      const item = _items.get(id);
      return item ? { id, ...item } : null;
    },
    async create(data: Omit<StoredItem, 'currentCount' | 'heatLevel' | 'amountPerPerson' | 'createdAt' | 'updatedAt'>) {
      const id = uid(), now = new Date();
      _items.set(id, { ...data, currentCount: 0, heatLevel: 0, amountPerPerson: null, createdAt: now, updatedAt: now });
      _commits.set(id, new Map());
      return id;
    },
    async update(id: string, data: Partial<StoredItem>) {
      const item = _items.get(id);
      if (!item) return false;
      _items.set(id, { ...item, ...data, updatedAt: new Date() });
      return true;
    },
    async delete(id: string) {
      _items.delete(id);
      _commits.delete(id);
    },
    async checkDeadlines() {
      const now = new Date();
      for (const [id, item] of _items) {
        if (item.status === 'open' && item.deadline < now) {
          _items.set(id, { ...item, status: 'failed', updatedAt: now });
        }
      }
    },
  },
  commitments: {
    async list(itemId: string) { return [...(_commits.get(itemId)?.values() ?? [])]; },
    async get(itemId: string, userId: string) { return _commits.get(itemId)?.get(userId) ?? null; },
    async create(itemId: string, userId: string, data: Pick<StoredCommitment, 'displayName' | 'photoURL'>) {
      const map = _commits.get(itemId);
      if (!map) throw new Error('item not found');
      map.set(userId, { userId, ...data, status: 'committed', committedAt: new Date(), paidAt: null });
      const item = _items.get(itemId)!;
      const newCount = map.size;
      const newHeat  = calcHeatLevel(newCount, item.targetCount);
      if (newCount >= item.targetCount) {
        _items.set(itemId, { ...item, currentCount: newCount, heatLevel: newHeat, status: 'funded', amountPerPerson: Math.ceil(item.totalCost / newCount), updatedAt: new Date() });
      } else {
        _items.set(itemId, { ...item, currentCount: newCount, heatLevel: newHeat, updatedAt: new Date() });
      }
    },
    async markPaid(itemId: string, userId: string) {
      const map = _commits.get(itemId), c = map?.get(userId);
      if (!c) throw new Error('commitment not found');
      map!.set(userId, { ...c, status: 'paid', paidAt: new Date() });
    },
  },
  users: {
    async get(uid: string): Promise<StoredUser | null> {
      return _users.get(uid) ?? null;
    },
    async upsert(uid: string, data: Partial<Omit<StoredUser, 'uid' | 'updatedAt'>>) {
      const existing = _users.get(uid);
      _users.set(uid, { uid, displayName: '', email: '', photoURL: null, ...existing, ...data, updatedAt: new Date() });
    },
  },
  pushTokens: {
    async save(uid: string, token: string) {
      _pushTokens.set(token, { uid, token });
    },
    async remove(token: string) {
      _pushTokens.delete(token);
    },
    async getAll() {
      return [..._pushTokens.values()];
    },
    async getForUsers(uids: string[]) {
      const set = new Set(uids);
      return [..._pushTokens.values()].filter(t => set.has(t.uid));
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ② Firestore 実装
// ═══════════════════════════════════════════════════════════════════════════════

import { Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

type DocSnap = FirebaseFirestore.DocumentSnapshot;

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

function itemFromDoc(doc: DocSnap): ({ id: string } & StoredItem) | null {
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title, description: d.description, imageURL: d.imageURL ?? null,
    totalCost: d.totalCost, targetCount: d.targetCount, currentCount: d.currentCount,
    heatLevel: d.heatLevel, status: d.status,
    deadline: toDate(d.deadline), creatorId: d.creatorId,
    amountPerPerson: d.amountPerPerson ?? null,
    createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt),
  };
}

function commitFromDoc(doc: DocSnap): StoredCommitment | null {
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    userId: doc.id, displayName: d.displayName, photoURL: d.photoURL ?? null,
    status: d.status, committedAt: toDate(d.committedAt),
    paidAt: d.paidAt ? toDate(d.paidAt) : null,
  };
}

function userFromDoc(doc: DocSnap): StoredUser | null {
  if (!doc.exists) return null;
  const d = doc.data()!;
  return { uid: doc.id, displayName: d.displayName, email: d.email, photoURL: d.photoURL ?? null, updatedAt: toDate(d.updatedAt) };
}

function makeFirestoreDb(fdb: Firestore) {
  return {
    items: {
      async list(filter?: { status?: ItemStatus | ItemStatus[] }) {
        const snap = await fdb.collection('items').get();
        let items = snap.docs.map(d => itemFromDoc(d)).filter(Boolean) as Array<{ id: string } & StoredItem>;
        if (filter?.status) {
          const s = Array.isArray(filter.status) ? filter.status : [filter.status];
          items = items.filter(i => s.includes(i.status));
        }
        return items;
      },
      async get(id: string) { return itemFromDoc(await fdb.collection('items').doc(id).get()); },
      async create(data: Omit<StoredItem, 'currentCount' | 'heatLevel' | 'amountPerPerson' | 'createdAt' | 'updatedAt'>) {
        const now = Timestamp.now(), ref = fdb.collection('items').doc();
        await ref.set({ ...data, deadline: Timestamp.fromDate(data.deadline), currentCount: 0, heatLevel: 0, amountPerPerson: null, createdAt: now, updatedAt: now });
        return ref.id;
      },
      async update(id: string, data: Partial<StoredItem>) {
        const patch: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
        if (data.deadline) patch.deadline = Timestamp.fromDate(data.deadline);
        await fdb.collection('items').doc(id).update(patch);
        return true;
      },
      async delete(id: string) {
        // サブコレクション commitments も削除
        const commitsSnap = await fdb.collection('items').doc(id).collection('commitments').get();
        const batch = fdb.batch();
        commitsSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(fdb.collection('items').doc(id));
        await batch.commit();
      },
      async checkDeadlines() {
        const snap = await fdb.collection('items').where('status', '==', 'open').get();
        const now  = Timestamp.now();
        const batch = fdb.batch();
        let count = 0;
        for (const doc of snap.docs) {
          const deadline = doc.data().deadline as Timestamp;
          if (deadline.toMillis() < now.toMillis()) {
            batch.update(doc.ref, { status: 'failed', updatedAt: now });
            count++;
          }
        }
        if (count > 0) await batch.commit();
      },
    },
    commitments: {
      async list(itemId: string) {
        const snap = await fdb.collection('items').doc(itemId).collection('commitments').get();
        return snap.docs.map(d => commitFromDoc(d)).filter(Boolean) as StoredCommitment[];
      },
      async get(itemId: string, userId: string) {
        return commitFromDoc(await fdb.collection('items').doc(itemId).collection('commitments').doc(userId).get());
      },
      async create(itemId: string, userId: string, data: Pick<StoredCommitment, 'displayName' | 'photoURL'>) {
        const itemRef = fdb.collection('items').doc(itemId);
        const commitRef = itemRef.collection('commitments').doc(userId);
        await fdb.runTransaction(async tx => {
          const snap = await tx.get(itemRef);
          if (!snap.exists) throw new Error('item not found');
          const d = snap.data()!;
          const newCount = (d.currentCount as number) + 1;
          const newHeat  = calcHeatLevel(newCount, d.targetCount);
          const now = Timestamp.now();
          tx.set(commitRef, { userId, ...data, status: 'committed', committedAt: now, paidAt: null });
          if (newCount >= d.targetCount) {
            tx.update(itemRef, { currentCount: newCount, heatLevel: newHeat, status: 'funded', amountPerPerson: Math.ceil(d.totalCost / newCount), updatedAt: now });
          } else {
            tx.update(itemRef, { currentCount: newCount, heatLevel: newHeat, updatedAt: now });
          }
        });
      },
      async markPaid(itemId: string, userId: string) {
        await fdb.collection('items').doc(itemId).collection('commitments').doc(userId)
          .update({ status: 'paid', paidAt: Timestamp.now() });
      },
    },
    users: {
      async get(uid: string): Promise<StoredUser | null> {
        return userFromDoc(await fdb.collection('users').doc(uid).get());
      },
      async upsert(uid: string, data: Partial<Omit<StoredUser, 'uid' | 'updatedAt'>>) {
        await fdb.collection('users').doc(uid).set({ ...data, updatedAt: Timestamp.now() }, { merge: true });
      },
    },
    pushTokens: {
      /** FCMトークンを保存（token をドキュメントIDにする） */
      async save(uid: string, token: string) {
        const id = Buffer.from(token).toString('base64').slice(0, 100);
        await fdb.collection('pushTokens').doc(id).set({ uid, token, createdAt: Timestamp.now() }, { merge: true });
      },
      async remove(token: string) {
        const id = Buffer.from(token).toString('base64').slice(0, 100);
        await fdb.collection('pushTokens').doc(id).delete();
      },
      async getAll() {
        const snap = await fdb.collection('pushTokens').get();
        return snap.docs.map(d => ({ uid: d.data().uid as string, token: d.data().token as string }));
      },
      async getForUsers(uids: string[]) {
        if (uids.length === 0) return [];
        // Firestore の 'in' クエリは10件制限なので分割
        const results: { uid: string; token: string }[] = [];
        for (let i = 0; i < uids.length; i += 10) {
          const chunk = uids.slice(i, i + 10);
          const snap = await fdb.collection('pushTokens').where('uid', 'in', chunk).get();
          snap.docs.forEach(d => results.push({ uid: d.data().uid, token: d.data().token }));
        }
        return results;
      },
    },
  };
}

// ─── エクスポート ─────────────────────────────────────────────────────────────

export const db = isFirebaseConfigured ? makeFirestoreDb(adminDb!) : mockDb;
