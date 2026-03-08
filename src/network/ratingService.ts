/**
 * JIBA — 段位サービス
 * player_ratings テーブルへの読み書き。
 * ネットワーク分離ルール: 外部通信コードは src/network/ 以下のみ。
 */

import { getSupabaseClient, MY_PLAYER_ID, toNetworkError } from './supabaseClient';
import { RatingRow } from './networkTypes';
import { RatingState, DEFAULT_RATING } from '../engine/rankEngine';

// ──────────────────────────────────────────────────────────────
// fetchRating
// ──────────────────────────────────────────────────────────────

/**
 * 指定プレイヤーの段位を取得する。
 * 未登録（初回）の場合は null を返す（PGRST116 = "no rows" は正常）。
 */
export async function fetchRating(playerId: string): Promise<RatingRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('player_ratings')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (error) {
    // PGRST116 = "JSON object requested, multiple (or no) rows returned" → 未登録
    if ((error as { code?: string }).code === 'PGRST116') return null;
    throw toNetworkError(error);
  }

  return data as RatingRow;
}

// ──────────────────────────────────────────────────────────────
// upsertRating
// ──────────────────────────────────────────────────────────────

/**
 * 自分の段位を upsert する（onConflict: 'player_id'）。
 * wins / losses / draws は既存値 + 1（新規なら 1）。
 */
export async function upsertRating(
  state: RatingState,
  outcomeField: 'wins' | 'losses' | 'draws',
  existingRow: RatingRow | null,
): Promise<void> {
  const supabase = getSupabaseClient();

  const wins   = (existingRow?.wins   ?? 0) + (outcomeField === 'wins'   ? 1 : 0);
  const losses = (existingRow?.losses ?? 0) + (outcomeField === 'losses' ? 1 : 0);
  const draws  = (existingRow?.draws  ?? 0) + (outcomeField === 'draws'  ? 1 : 0);

  const { error } = await supabase
    .from('player_ratings')
    .upsert(
      {
        player_id: MY_PLAYER_ID,
        rank: state.rank,
        points: state.points,
        wins,
        losses,
        draws,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player_id' },
    );

  if (error) throw toNetworkError(error);
}

// ──────────────────────────────────────────────────────────────
// updateUsername
// ──────────────────────────────────────────────────────────────

/**
 * ユーザーネームを player_ratings に保存する。
 * 行が存在する場合は username 列だけ更新。
 * 行が未作成（オンライン未プレイ）の場合はデフォルト段位で INSERT する。
 */
export async function updateUsername(
  playerId: string,
  username: string,
): Promise<void> {
  const supabase = getSupabaseClient();

  // 既存行を更新（username のみ）
  const { data: updated, error: updateError } = await supabase
    .from('player_ratings')
    .update({ username, updated_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .select('player_id');

  if (updateError) throw toNetworkError(updateError);

  // 行が存在しなかった場合はデフォルト段位で INSERT
  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('player_ratings')
      .insert({
        player_id: playerId,
        username,
        rank: DEFAULT_RATING.rank,
        points: DEFAULT_RATING.points,
        wins: 0,
        losses: 0,
        draws: 0,
        updated_at: new Date().toISOString(),
      });

    // 23505 = unique_violation（競合条件は無視）
    if (insertError && (insertError as { code?: string }).code !== '23505') {
      throw toNetworkError(insertError);
    }
  }
}
