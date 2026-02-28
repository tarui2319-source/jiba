/**
 * JIBA — usePlayerRating
 * オンライン対戦での段位管理フック。
 * - 対局開始時に fetchRating でロード
 * - 対局終了時に applyOutcome → upsertRating（fire-and-forget）
 * - resultAppliedRef で二重適用防止
 * - currentRatingRef / cachedRowRef で stale closure 回避
 */

import { useState, useEffect, useRef } from 'react';
import { GameResult } from '../engine/types';
import {
  RatingState,
  RatingDelta,
  DEFAULT_RATING,
  applyOutcome,
  GameOutcome,
} from '../engine/rankEngine';
import { RatingRow } from '../network/networkTypes';
import { fetchRating, upsertRating } from '../network/ratingService';
import { MY_PLAYER_ID } from '../network/supabaseClient';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export interface UsePlayerRatingProps {
  gameResult: GameResult | null;
  myPlayer: 'first' | 'second' | null;
  isOnlineGame: boolean;
}

export interface UsePlayerRatingReturn {
  currentRating: RatingState | null;
  ratingDelta: RatingDelta | null;
  isLoading: boolean;
}

// ──────────────────────────────────────────────────────────────
// ユーティリティ: GameResult → GameOutcome
// ──────────────────────────────────────────────────────────────

function toOutcome(result: GameResult, myPlayer: 'first' | 'second'): GameOutcome {
  if (result.winner === 'draw') return 'draw';
  return result.winner === myPlayer ? 'win' : 'loss';
}

function toOutcomeField(outcome: GameOutcome): 'wins' | 'losses' | 'draws' {
  switch (outcome) {
    case 'win':  return 'wins';
    case 'loss': return 'losses';
    case 'draw': return 'draws';
  }
}

// ──────────────────────────────────────────────────────────────
// フック本体
// ──────────────────────────────────────────────────────────────

export function usePlayerRating({
  gameResult,
  myPlayer,
  isOnlineGame,
}: UsePlayerRatingProps): UsePlayerRatingReturn {
  const [currentRating, setCurrentRating] = useState<RatingState | null>(null);
  const [ratingDelta, setRatingDelta] = useState<RatingDelta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // stale closure 回避: state を ref にも持つ
  const currentRatingRef = useRef<RatingState | null>(null);
  // fetchRating で取得した DB 行（upsert 時の wins/losses/draws 計算用）
  const cachedRowRef = useRef<RatingRow | null>(null);
  // 結果適用済みフラグ（二重適用防止）
  const resultAppliedRef = useRef(false);

  // Effect 1: オンライン対戦開始時に段位をロード
  useEffect(() => {
    if (!isOnlineGame) return;

    let cancelled = false;
    setIsLoading(true);
    resultAppliedRef.current = false;

    fetchRating(MY_PLAYER_ID)
      .then(row => {
        if (cancelled) return;
        const rating: RatingState = row
          ? { rank: row.rank, points: row.points }
          : DEFAULT_RATING;
        setCurrentRating(rating);
        currentRatingRef.current = rating;
        cachedRowRef.current = row;
      })
      .catch(() => {
        if (cancelled) return;
        // フェッチ失敗: デフォルト値にフォールバック
        setCurrentRating(DEFAULT_RATING);
        currentRatingRef.current = DEFAULT_RATING;
        cachedRowRef.current = null;
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOnlineGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: ゲーム結果確定時に段位を更新
  useEffect(() => {
    if (!gameResult || !myPlayer || !isOnlineGame) return;
    if (resultAppliedRef.current) return;
    resultAppliedRef.current = true;

    const rating = currentRatingRef.current ?? DEFAULT_RATING;
    const outcome = toOutcome(gameResult, myPlayer);
    const delta = applyOutcome(rating, outcome);

    // ローカル即時反映
    setCurrentRating(delta.after);
    currentRatingRef.current = delta.after;
    setRatingDelta(delta);

    // DB 非同期更新（fire-and-forget）
    upsertRating(delta.after, toOutcomeField(outcome), cachedRowRef.current)
      .catch(() => {});
  }, [gameResult, myPlayer, isOnlineGame]);

  // Effect 3: ゲームリセット（result が null に戻る）で resultAppliedRef をリセット
  useEffect(() => {
    if (gameResult === null) {
      resultAppliedRef.current = false;
      setRatingDelta(null);
    }
  }, [gameResult]);

  return { currentRating, ratingDelta, isLoading };
}
