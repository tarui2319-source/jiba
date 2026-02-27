/**
 * JIBA — Supabase クライアント
 * シングルトン。アプリ全体で 1 つの WebSocket 接続を共有する。
 * ネットワーク分離ルール: このファイルのみが @supabase/supabase-js を import 可能。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_AKEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ──────────────────────────────────────────────────────────────
// Supabase クライアント シングルトン
// ──────────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_AKEY, {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ──────────────────────────────────────────────────────────────
// 匿名プレイヤーID
// localStorage に永続化（同じブラウザなら段位を継続）
// localStorage が使えない環境（native など）はセッション単位 UUID にフォールバック
// ──────────────────────────────────────────────────────────────

export const MY_PLAYER_ID: string = (() => {
  const KEY = 'jiba_player_id';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
    const id = uuidv4();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // native / SSR など localStorage が存在しない環境
    return uuidv4();
  }
})();
