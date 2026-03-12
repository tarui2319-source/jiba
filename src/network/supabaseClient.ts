/**
 * JIBA — Supabase クライアント
 * シングルトン。アプリ全体で 1 つの WebSocket 接続を共有する。
 * ネットワーク分離ルール: このファイルのみが @supabase/supabase-js を import 可能。
 *
 * セキュリティ設計:
 *   - Supabase Anonymous Auth を使用して auth.uid() を player_id とする
 *   - persistSession: true でセッションを localStorage に保持
 *   - initPlayer() を App.tsx 起動時に一度だけ呼び出すこと
 *   - MY_PLAYER_ID は initPlayer() 完了後に auth.uid() がセットされる
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      // AsyncStorage でセッションを永続化（ネイティブビルド対応）
      auth: { persistSession: true, storage: AsyncStorage },
    });
  }
  return _client;
}

// ──────────────────────────────────────────────────────────────
// 匿名プレイヤーID（= auth.uid()）
// initPlayer() が完了するまで空文字列。
// ES モジュールの live binding により、initPlayer() 完了後に
// 他モジュールから読み取ると更新済みの値が得られる。
// ──────────────────────────────────────────────────────────────

export let MY_PLAYER_ID = '';

/**
 * 匿名認証を初期化し、MY_PLAYER_ID を auth.uid() にセットする。
 * App.tsx のレンダリング前に一度だけ呼び出すこと。
 *
 * - 既存セッションがあればそれを再利用（段位データが継続される）
 * - セッションがなければ signInAnonymously() で新規匿名ユーザーを作成
 * - Supabase が未設定 / オフラインの場合はフォールバック UUID を使用
 */
export async function initPlayer(): Promise<void> {
  const sb = getSupabaseClient();

  // 既存セッションを確認（アプリ再起動後の継続）
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user?.id) {
    MY_PLAYER_ID = session.user.id;
    return;
  }

  // 新規匿名サインイン
  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) {
    // フォールバック: Supabase 未設定 / オフライン環境向け（開発時）
    MY_PLAYER_ID = await _generateFallbackId();
    return;
  }
  MY_PLAYER_ID = data.user.id;
}

// ──────────────────────────────────────────────────────────────
// エラーサニタイズ
// DBトリガーメッセージ・テーブル名・カラム名がUIに漏れないよう
// service層で汎用メッセージに変換する（defense in depth）
// ──────────────────────────────────────────────────────────────

/**
 * Supabase/PostgreSQL の生のエラーメッセージをアプリ内部エラーに変換する。
 * DB内部情報（テーブル名・カラム名・トリガーメッセージ）をUIに漏らさない。
 */
export function toNetworkError(
  _error: { message?: string } | null | undefined,
  genericMessage = 'ネットワークエラーが発生しました',
): Error {
  return new Error(genericMessage);
}

/** Supabase が使えない場合のフォールバック ID（AsyncStorage に永続化） */
async function _generateFallbackId(): Promise<string> {
  const KEY = 'jiba_player_id_fallback';
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) return stored;
    const id = _uuid();
    await AsyncStorage.setItem(KEY, id);
    return id;
  } catch {
    return _uuid();
  }
}

/** crypto.randomUUID が使える場合は使う（React Native では react-native-get-random-values で polyfill） */
function _uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 フォールバック
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
