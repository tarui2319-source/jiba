/**
 * JIBA — useMatchmaking
 * ロビーマッチング状態機械フック。
 *
 * 状態遷移:
 *   idle → searching → matched
 *                    → waiting_for_opponent → matched
 *                                          → error（タイムアウト）
 *                    → error（DB / ROOM_TAKEN 後リトライ失敗）
 *   any  → cancelMatchmaking() → idle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameMode } from '../engine/types';
import { MatchResult } from '../network/networkTypes';
import { findOrCreateRoom, pollRoomStatus, deleteOwnWaitingRoom } from '../network/roomService';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export type MatchmakingState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'waiting_for_opponent'; roomId: string }
  | { status: 'matched'; result: MatchResult }
  | { status: 'error'; message: string };

export interface UseMatchmakingReturn {
  matchState: MatchmakingState;
  startMatchmaking: (mode: GameMode) => void;
  cancelMatchmaking: () => void;
}

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 60_000;

// ──────────────────────────────────────────────────────────────
// フック本体
// ──────────────────────────────────────────────────────────────

export function useMatchmaking(): UseMatchmakingReturn {
  const [matchState, setMatchState] = useState<MatchmakingState>({ status: 'idle' });

  /** アンマウント後 / キャンセル後の setState を防ぐフラグ */
  const isCancelledRef = useRef(false);
  /** ポーリング用タイマー ID */
  const pollTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  /** ポーリング用タイムアウト ID */
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 待機中ルーム ID（キャンセル時削除用） */
  const waitingRoomRef = useRef<string | null>(null);

  // ── ポーリング停止ヘルパー ─────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current   != null) clearInterval(pollTimerRef.current);
    if (pollTimeoutRef.current != null) clearTimeout(pollTimeoutRef.current);
    pollTimerRef.current   = null;
    pollTimeoutRef.current = null;
  }, []);

  // ── RED ポーリング開始 ────────────────────────────────────
  const startPolling = useCallback((result: MatchResult) => {
    const roomId = result.roomId;
    waitingRoomRef.current = roomId;

    const poll = async () => {
      if (isCancelledRef.current) return;
      try {
        const status = await pollRoomStatus(roomId);
        if (isCancelledRef.current) return;
        if (status === 'playing') {
          stopPolling();
          waitingRoomRef.current = null;
          setMatchState({ status: 'matched', result });
        }
        // 'waiting' は継続、'finished' は想定外なので次回ポーリングに委ねる
      } catch {
        // ポーリングエラーは無視して次回再試行
      }
    };

    // 即時 1 回実行してから定期実行
    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // タイムアウト: 60 秒経過でエラー
    pollTimeoutRef.current = setTimeout(() => {
      if (isCancelledRef.current) return;
      stopPolling();
      waitingRoomRef.current = null;
      setMatchState({ status: 'error', message: '対戦相手が見つかりませんでした。再度お試しください。' });
    }, POLL_TIMEOUT_MS);
  }, [stopPolling]);

  // ── マッチング開始（内部） ────────────────────────────────
  const _runMatchmaking = useCallback(async (mode: GameMode, isRetry: boolean) => {
    try {
      const result = await findOrCreateRoom(mode);
      if (isCancelledRef.current) return;

      if (result.myPlayer === 'blue') {
        // BLUE: 即座にマッチ完了
        setMatchState({ status: 'matched', result });
      } else {
        // RED: 相手が参加するまでポーリング
        setMatchState({ status: 'waiting_for_opponent', roomId: result.roomId });
        startPolling(result);
      }
    } catch (err: unknown) {
      if (isCancelledRef.current) return;

      const message = err instanceof Error ? err.message : String(err);

      if (message === 'ROOM_TAKEN' && !isRetry) {
        // 競合: 1 回だけ自動リトライ
        if (!isCancelledRef.current) {
          await _runMatchmaking(mode, true);
        }
      } else {
        setMatchState({ status: 'error', message: 'マッチングに失敗しました。再度お試しください。' });
      }
    }
  }, [startPolling]);

  // ── 公開: マッチング開始 ──────────────────────────────────
  const startMatchmaking = useCallback((mode: GameMode) => {
    isCancelledRef.current = false;
    waitingRoomRef.current = null;
    setMatchState({ status: 'searching' });
    _runMatchmaking(mode, false);
  }, [_runMatchmaking]);

  // ── 公開: キャンセル ──────────────────────────────────────
  const cancelMatchmaking = useCallback(() => {
    isCancelledRef.current = true;
    stopPolling();

    // 作成済みの waiting ルームを削除（fire-and-forget）
    if (waitingRoomRef.current) {
      deleteOwnWaitingRoom(waitingRoomRef.current).catch(() => {});
      waitingRoomRef.current = null;
    }

    setMatchState({ status: 'idle' });
  }, [stopPolling]);

  // ── クリーンアップ（アンマウント時） ──────────────────────
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      stopPolling();
      if (waitingRoomRef.current) {
        deleteOwnWaitingRoom(waitingRoomRef.current).catch(() => {});
      }
    };
  }, [stopPolling]);

  return { matchState, startMatchmaking, cancelMatchmaking };
}
