/**
 * JIBA — 段位エンジン
 * 純粋関数のみ（IO なし・React なし）。
 * エンジン純粋性ルール遵守。
 *
 * ルール:
 *   勝ち: +20P  / 負け: -10P
 *   100P 達成 → 昇段（新段位は 20P スタート）/ 10段は 100P キャップ
 *   0P 未満   → 降格（前段位は 50P スタート）/ 1段は 0P フロア
 */

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export interface RatingState {
  rank: number;   // 1 〜 10
  points: number; // 0 〜 100
}

export type GameOutcome = 'win' | 'loss' | 'draw';

export interface RatingDelta {
  before: RatingState;
  after: RatingState;
  pointsDelta: number;           // 実際に加減されたポイント（キャップ・フロア後）
  rankChanged: boolean;
  direction: 'up' | 'down' | 'none';
}

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────

export const DEFAULT_RATING: RatingState = { rank: 1, points: 0 };

const WIN_POINTS  =  20;
const LOSS_POINTS = -10;
const RANK_MIN    =   1;
const RANK_MAX    =  10;
const POINTS_MIN  =   0;
const POINTS_MAX  = 100;
const RANKUP_THRESHOLD   = 100; // このポイント以上で昇段
const NEW_RANK_START     =  20; // 昇段後の初期ポイント
const RANKDOWN_START     =  50; // 降格後の初期ポイント

// ──────────────────────────────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────────────────────────────

function clampPoints(p: number): number {
  return Math.max(POINTS_MIN, Math.min(POINTS_MAX, p));
}

function makeDelta(
  before: RatingState,
  after: RatingState,
  rawDelta: number,
): RatingDelta {
  const rankChanged = after.rank !== before.rank;
  const direction: RatingDelta['direction'] =
    after.rank > before.rank ? 'up' :
    after.rank < before.rank ? 'down' :
    'none';
  const pointsDelta = after.points - before.points + (after.rank - before.rank) * 0;
  // ランク変化がある場合は raw delta を返す（表示用）
  return {
    before,
    after,
    pointsDelta: rawDelta,
    rankChanged,
    direction,
  };
}

// ──────────────────────────────────────────────────────────────
// 勝利
// ──────────────────────────────────────────────────────────────

export function applyWin(s: RatingState): RatingDelta {
  const newPoints = s.points + WIN_POINTS;

  if (newPoints >= RANKUP_THRESHOLD && s.rank < RANK_MAX) {
    // 昇段
    const after: RatingState = { rank: s.rank + 1, points: NEW_RANK_START };
    return makeDelta(s, after, WIN_POINTS);
  }

  if (s.rank === RANK_MAX) {
    // 10段上限: ポイントを 100 でキャップ
    const after: RatingState = { rank: RANK_MAX, points: clampPoints(newPoints) };
    return makeDelta(s, after, WIN_POINTS);
  }

  // 通常: ポイント加算
  const after: RatingState = { rank: s.rank, points: clampPoints(newPoints) };
  return makeDelta(s, after, WIN_POINTS);
}

// ──────────────────────────────────────────────────────────────
// 敗北
// ──────────────────────────────────────────────────────────────

export function applyLoss(s: RatingState): RatingDelta {
  const newPoints = s.points + LOSS_POINTS;

  if (newPoints < POINTS_MIN && s.rank > RANK_MIN) {
    // 降格
    const after: RatingState = { rank: s.rank - 1, points: RANKDOWN_START };
    return makeDelta(s, after, LOSS_POINTS);
  }

  // 1段フロア or 通常
  const after: RatingState = { rank: s.rank, points: clampPoints(newPoints) };
  return makeDelta(s, after, LOSS_POINTS);
}

// ──────────────────────────────────────────────────────────────
// 引き分け
// ──────────────────────────────────────────────────────────────

export function applyDraw(s: RatingState): RatingDelta {
  return makeDelta(s, { ...s }, 0);
}

// ──────────────────────────────────────────────────────────────
// ディスパッチャ
// ──────────────────────────────────────────────────────────────

export function applyOutcome(s: RatingState, outcome: GameOutcome): RatingDelta {
  switch (outcome) {
    case 'win':  return applyWin(s);
    case 'loss': return applyLoss(s);
    case 'draw': return applyDraw(s);
  }
}

// ──────────────────────────────────────────────────────────────
// 表示ヘルパー
// ──────────────────────────────────────────────────────────────

export function rankLabel(rank: number): string {
  return `${rank}段`;
}

export function rankIcon(_rank: number): string {
  return '';
}
