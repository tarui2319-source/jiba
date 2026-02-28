/**
 * JIBA — moveService
 * 手番の DB 挿入・Realtime 購読・初期同期。
 * 外部通信は src/network/ 内のみ（ネットワーク分離ルール）。
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { Action, ShapeKind } from '../engine/types';
import { getSupabaseClient, MY_PLAYER_ID } from './supabaseClient';
import { MoveRow, OnOpponentMove } from './networkTypes';

/** Realtime チャンネルの接続状態 */
export type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

/**
 * 自分の手番を DB に挿入。
 * @param seq  moveHistory.length（dispatch 前に取得すること）
 */
export async function insertMove(
  roomId: string,
  player: 'first' | 'second',
  seq: number,
  action: Action,
): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from('moves').insert({
    room_id: roomId,
    player,
    player_id: MY_PLAYER_ID,
    seq,
    move_type: action.type,
    row: action.row,
    col: action.col,
    shape: action.shape,
  });
  if (error) throw new Error(error.message);
}

/**
 * 降参を DB に挿入。
 */
export async function insertSurrenderMove(
  roomId: string,
  player: 'first' | 'second',
  seq: number,
): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from('moves').insert({
    room_id: roomId,
    player,
    player_id: MY_PLAYER_ID,
    seq,
    move_type: 'surrender',
    row: 0,
    col: 0,
    shape: 'weak',
  });
  if (error) throw new Error(error.message);
}

/**
 * 対戦相手の手番を Realtime で購読。
 * 自分の echo（player === myPlayer）は無視する。
 * @param onStatusChange  オプション: チャンネル接続状態の変化を通知（再接続検知用）
 * @returns channel  cleanup 用に返す（呼び出し側で unsubscribe すること）
 */
export function subscribeToOpponentMoves(
  roomId: string,
  myPlayer: 'first' | 'second',
  onMove: OnOpponentMove,
  onStatusChange?: (status: ChannelStatus) => void,
): RealtimeChannel {
  const sb = getSupabaseClient();

  const channel = sb
    .channel(`moves:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as MoveRow;
        // 自分の手番の echo は無視
        if (row.player !== myPlayer) {
          onMove(row);
        }
      },
    )
    .subscribe((status) => {
      onStatusChange?.(status as ChannelStatus);
    });

  return channel;
}

/**
 * ルームの既存手番を全件取得（seq 昇順）。
 * 購読開始後に呼び出してキャッチアップする。
 */
export async function fetchExistingMoves(roomId: string): Promise<MoveRow[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('moves')
    .select('*')
    .eq('room_id', roomId)
    .order('seq', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MoveRow[];
}

/**
 * DB の MoveRow を engine の Action に変換。
 */
export function moveRowToAction(row: MoveRow): Action {
  return {
    type: row.move_type as 'build' | 'stack',
    row: row.row,
    col: row.col,
    shape: row.shape as ShapeKind,
  };
}
