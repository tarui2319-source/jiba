/**
 * JIBA — 段位サービス
 * player_ratings テーブルへの読み書き。
 * ネットワーク分離ルール: 外部通信コードは src/network/ 以下のみ。
 */

import { getSupabaseClient, MY_PLAYER_ID } from './supabaseClient';
import { RatingRow } from './networkTypes';
import { RatingState } from '../engine/rankEngine';

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
    throw new Error(error.message);
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

  if (error) throw new Error(error.message);
}
