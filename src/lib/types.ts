// ─── Status Types ────────────────────────────────────────────────────────────

export type ItemStatus = 'open' | 'funded' | 'failed' | 'ordered';
export type CommitmentStatus = 'committed' | 'paid';

/**
 * 熱量レベル（0〜4）
 * クライアントに公開される唯一の「参加状況」指標。
 * 正確な人数は status: 'open' の間は秘匿される。
 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

// ─── View Models (クライアントに渡す型) ──────────────────────────────────────

export interface ItemView {
  id: string;
  title: string;
  description: string;
  imageURL: string | null;
  totalCost: number;
  targetCount: number;
  heatLevel: HeatLevel;       // currentCount は含まない（open 中は秘匿）
  status: ItemStatus;
  deadline: Date;
  creatorId: string;
  amountPerPerson: number | null;
  createdAt: Date;
  updatedAt: Date;
  myCommitment: CommitmentView | null;
}

export interface CommitmentView {
  userId: string;
  displayName: string;
  photoURL: string | null;
  status: CommitmentStatus;
  committedAt: Date;
  paidAt: Date | null;
}

// ─── Heat Level Metadata ─────────────────────────────────────────────────────

export interface HeatMeta {
  label: string;
  sub: string;
  fill: string;
  width: string;
  pulse: false | 'slow' | 'medium' | 'fast';
}

export const HEAT_META: Record<HeatLevel, HeatMeta> = {
  0: { label: 'まだ静か',           sub: '最初の一歩を踏み出す人を待っています', fill: '#d1d5db', width: '6%',   pulse: false    },
  1: { label: '動き始めた',         sub: '誰かが動いている気配があります',         fill: '#60a5fa', width: '30%',  pulse: 'slow'   },
  2: { label: '熱気が高まってる',   sub: 'このまま乗り遅れるかも',                fill: '#f59e0b', width: '58%',  pulse: 'medium' },
  3: { label: 'かなり盛り上がってる', sub: '締め切りが近いかもしれない',           fill: '#ef4444', width: '84%',  pulse: 'fast'   },
  4: { label: '目標達成',           sub: '全員で支払いを完了させましょう',         fill: '#22c55e', width: '100%', pulse: false    },
};

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * currentCount / targetCount から heatLevel を算出。
 * ⚠️ サーバーサイドでのみ使用すること（currentCount をクライアントに渡さないため）
 */
export function calcHeatLevel(currentCount: number, targetCount: number): HeatLevel {
  if (targetCount <= 0) return 0;
  if (currentCount >= targetCount) return 4;
  const ratio = currentCount / targetCount;
  if (ratio === 0) return 0;
  if (ratio <= 0.33) return 1;
  if (ratio <= 0.66) return 2;
  return 3;
}
