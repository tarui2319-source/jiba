/**
 * JIBA — useOnlineGame
 * オンラインゲーム統合フック。
 * - 相手手番の Realtime 購読 + 初期同期
 * - out-of-order バッファ（seq 順保証）
 * - オプティミスティック applyOnlineMove
 * - ゲーム終了時の closeRoom
 * - Realtime 切断検知 + 自動再接続（最大 5 回）
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Action } from '../engine/types';
import { MatchResult, MoveRow } from '../network/networkTypes';
import {
  subscribeToOpponentMoves,
  fetchExistingMoves,
  insertMove,
  insertSurrenderMove,
  moveRowToAction,
  ChannelStatus,
} from '../network/moveService';
import { closeRoom } from '../network/roomService';
import { UseGameStateReturn } from './useGameState';

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────

const MAX_RECONNECT_RETRIES = 5;
const RECONNECT_DELAY_MS = 2000;

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export interface UseOnlineGameProps {
  gameStateReturn: UseGameStateReturn;
  /** null の場合はオンライン機能を無効化 */
  matchResult: MatchResult | null;
}

export interface UseOnlineGameReturn {
  /** オプティミスティックな手番適用（ローカル即時 + DB 非同期） */
  applyOnlineMove: (action: Action) => void;
  /** オンライン降参（ローカル + DB 非同期） */
  surrenderOnline: () => void;
  isOnlineGame: boolean;
  myPlayer: 'first' | 'second' | null;
  /** Realtime 再接続中フラグ */
  isReconnecting: boolean;
  /** MAX_RETRIES 超過で再接続を断念したフラグ */
  isConnectionFailed: boolean;
}

// ──────────────────────────────────────────────────────────────
// フック本体
// ──────────────────────────────────────────────────────────────

export function useOnlineGame({
  gameStateReturn,
  matchResult,
}: UseOnlineGameProps): UseOnlineGameReturn {
  const { gameState, applyMove, surrender } = gameStateReturn;

  /** 期待する次の相手 seq */
  const expectedSeqRef = useRef(0);
  /** out-of-order バッファ: key = seq */
  const pendingMovesRef = useRef<Map<number, MoveRow>>(new Map());
  /** closeRoom 送信済みフラグ（2重送信防止） */
  const roomClosedRef = useRef(false);
  /** 現在の Realtime チャンネル */
  const channelRef = useRef<ReturnType<typeof subscribeToOpponentMoves> | null>(null);

  /** 再接続中フラグ */
  const [isReconnecting, setIsReconnecting] = useState(false);
  /** MAX_RETRIES 超過で接続断念フラグ */
  const [isConnectionFailed, setIsConnectionFailed] = useState(false);

  // ── 相手手番適用ヘルパー ──────────────────────────────────
  const applyOpponentMove = useCallback((row: MoveRow) => {
    applyMove(moveRowToAction(row));
    expectedSeqRef.current = row.seq + 2; // 相手の次回 seq は +2（自分の seq を挟む）
  }, [applyMove]);

  // ── バッファドレイン ──────────────────────────────────────
  const drainPending = useCallback(() => {
    const pending = pendingMovesRef.current;
    let next: MoveRow | undefined;
    while ((next = pending.get(expectedSeqRef.current)) !== undefined) {
      pending.delete(expectedSeqRef.current);
      applyOpponentMove(next);
    }
  }, [applyOpponentMove]);

  // ── 相手手番ハンドラ ──────────────────────────────────────
  const handleOpponentMove = useCallback((row: MoveRow) => {
    // 相手が降参した場合
    if (row.move_type === 'surrender') {
      surrender(row.player as 'first' | 'second');
      return;
    }

    if (row.seq === expectedSeqRef.current) {
      applyOpponentMove(row);
      drainPending();
    } else if (row.seq > expectedSeqRef.current) {
      // 将来の seq → バッファに追加
      pendingMovesRef.current.set(row.seq, row);
    }
    // row.seq < expectedSeq → 重複、無視
  }, [applyOpponentMove, drainPending, surrender]);

  // ── Realtime 購読 + 再接続ロジック ───────────────────────
  useEffect(() => {
    if (!matchResult) return;

    const { roomId, myPlayer, nextOpponentSeq } = matchResult;

    // 期待 seq をリセット
    const defaultFirstSeq = myPlayer === 'first' ? 1 : 0;
    expectedSeqRef.current = nextOpponentSeq > 0 ? nextOpponentSeq : defaultFirstSeq;
    pendingMovesRef.current.clear();
    roomClosedRef.current = false;

    let retries = 0;

    const subscribe = () => {
      channelRef.current?.unsubscribe();
      channelRef.current = subscribeToOpponentMoves(
        roomId,
        myPlayer,
        handleOpponentMove,
        (status: ChannelStatus) => {
          if (status === 'SUBSCRIBED') {
            setIsReconnecting(false);
            retries = 0;
          } else if (
            (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')
            && !roomClosedRef.current
          ) {
            if (retries >= MAX_RECONNECT_RETRIES) {
              setIsReconnecting(false);
              setIsConnectionFailed(true);
              return;
            }
            retries++;
            setIsReconnecting(true);
            setTimeout(() => {
              subscribe();
              // キャッチアップ: 見逃した手番を再フェッチ
              fetchExistingMoves(roomId)
                .then(rows => {
                  rows
                    .filter(m => m.player !== myPlayer && m.seq >= expectedSeqRef.current)
                    .forEach(handleOpponentMove);
                })
                .catch(() => {});
            }, RECONNECT_DELAY_MS);
          }
        },
      );
    };

    subscribe();

    // 初期キャッチアップ（購読開始後にフェッチして見落とし防止）
    fetchExistingMoves(roomId)
      .then(moves => {
        moves
          .filter(m => m.player !== myPlayer)
          .forEach(handleOpponentMove);
      })
      .catch(() => {}); // フェッチ失敗は無視（Realtime でカバー）

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [matchResult?.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ゲーム終了時に closeRoom ──────────────────────────────
  useEffect(() => {
    if (!matchResult || !gameState.result || roomClosedRef.current) return;
    roomClosedRef.current = true;
    closeRoom(matchResult.roomId).catch(() => {});
  }, [gameState.result, matchResult]);

  // ── 公開: オプティミスティック手番適用 ───────────────────
  const applyOnlineMove = useCallback((action: Action) => {
    if (!matchResult) return;

    // dispatch 前に seq を取得（moveHistory は 0-indexed ゲーム通し番号）
    const seq = gameState.turnState.moveHistory.length;

    // 1. ローカル即時反映
    applyMove(action);

    // 2. DB 非同期挿入（fire-and-forget: 失敗は無視）
    insertMove(matchResult.roomId, matchResult.myPlayer, seq, action).catch(() => {});
  }, [matchResult, gameState.turnState.moveHistory.length, applyMove]);

  // ── 公開: オンライン降参 ───────────────────────────────
  const surrenderOnline = useCallback(() => {
    if (!matchResult) return;

    const seq = gameState.turnState.moveHistory.length;

    // 1. ローカル即時反映
    surrender(matchResult.myPlayer);

    // 2. DB 非同期挿入（fire-and-forget）
    insertSurrenderMove(matchResult.roomId, matchResult.myPlayer, seq).catch(() => {});
  }, [matchResult, gameState.turnState.moveHistory.length, surrender]);

  return {
    applyOnlineMove,
    surrenderOnline,
    isOnlineGame: matchResult !== null,
    myPlayer: matchResult?.myPlayer ?? null,
    isReconnecting,
    isConnectionFailed,
  };
}
