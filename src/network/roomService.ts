/**
 * JIBA — roomService
 * ロビーマッチング・ルーム操作。
 * 外部通信は src/network/ 内のみ（ネットワーク分離ルール）。
 */

import { GameMode } from '../engine/types';
import { getSupabaseClient, MY_PLAYER_ID, toNetworkError } from './supabaseClient';
import { MatchResult, RoomRow } from './networkTypes';

/** 5 分以上前の waiting ルームはスタール扱いで無視 */
const STALE_ROOM_MINUTES = 5;

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

/**
 * ロビーを検索して参加 or 新規ルーム作成。
 * - 既存 waiting ルームが見つかった → FIRST として参加
 * - 見つからなかった               → SECOND として新規作成
 * @throws ROOM_TAKEN  競合でジョインに失敗（呼び出し側で 1 回リトライ推奨）
 * @throws その他 DB エラー
 */
export async function findOrCreateRoom(mode: GameMode): Promise<MatchResult> {
  const sb = getSupabaseClient();
  const staleThreshold = new Date(
    Date.now() - STALE_ROOM_MINUTES * 60 * 1000,
  ).toISOString();

  // 待機中ルームを 1 件取得（自分が作ったルームは除外）
  const { data: candidates, error: findError } = await sb
    .from('rooms')
    .select('*')
    .eq('mode', mode)
    .eq('status', 'waiting')
    .neq('second_id', MY_PLAYER_ID)
    .gte('created_at', staleThreshold)
    .order('created_at', { ascending: true })
    .limit(1);

  if (findError) throw toNetworkError(findError);

  if (candidates && candidates.length > 0) {
    return _joinRoom(candidates[0] as RoomRow);
  }

  return _createRoom(mode);
}

/**
 * SECOND クリエイターが対戦相手の参加を確認するポーリング用。
 * @returns 現在のルームステータス
 */
export async function pollRoomStatus(
  roomId: string,
): Promise<'waiting' | 'playing' | 'finished'> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('rooms')
    .select('status')
    .eq('id', roomId)
    .single();

  if (error || !data) throw toNetworkError(error);
  return data.status as 'waiting' | 'playing' | 'finished';
}

/**
 * 現在マッチング待機中のプレイヤー数を取得する。
 */
export async function getWaitingCount(mode: GameMode): Promise<number> {
  const sb = getSupabaseClient();
  const staleThreshold = new Date(
    Date.now() - STALE_ROOM_MINUTES * 60 * 1000,
  ).toISOString();
  const { count } = await sb
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('mode', mode)
    .eq('status', 'waiting')
    .gte('created_at', staleThreshold);
  return count ?? 0;
}

/**
 * ゲーム終了時にルームを finished に更新。
 * 失敗は無視して良い（fire-and-forget での使用を想定）。
 */
export async function closeRoom(roomId: string): Promise<void> {
  const sb = getSupabaseClient();
  await sb.from('rooms').update({ status: 'finished' }).eq('id', roomId);
}

/**
 * 自分が作った waiting ルームを削除。
 * キャンセル・アンマウント時に呼ぶ。
 * second_id と status の二重ガードで誤削除を防ぐ。
 */
export async function deleteOwnWaitingRoom(roomId: string): Promise<void> {
  const sb = getSupabaseClient();
  await sb
    .from('rooms')
    .delete()
    .eq('id', roomId)
    .eq('second_id', MY_PLAYER_ID)
    .eq('status', 'waiting');
}

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

async function _joinRoom(room: RoomRow): Promise<MatchResult> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('rooms')
    .update({ first_id: MY_PLAYER_ID, status: 'playing' })
    .eq('id', room.id)
    .eq('status', 'waiting'); // 競合防止: まだ waiting の場合のみ更新

  if (error) throw new Error('ROOM_TAKEN');

  return {
    roomId: room.id,
    myPlayer: 'first',
    mode: room.mode,
    nextOpponentSeq: 0,
  };
}

async function _createRoom(mode: GameMode): Promise<MatchResult> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('rooms')
    .insert({ mode, second_id: MY_PLAYER_ID, status: 'waiting' })
    .select()
    .single();

  if (error || !data) throw toNetworkError(error);

  return {
    roomId: data.id,
    myPlayer: 'second',
    mode: data.mode as GameMode,
    nextOpponentSeq: 0,
  };
}
