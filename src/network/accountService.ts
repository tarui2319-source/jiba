/**
 * JIBA — アカウントサービス
 * アカウント削除（データ全消去 + サインアウト）。
 * ネットワーク分離ルール: 外部通信コードは src/network/ 以下のみ。
 */

import { getSupabaseClient, toNetworkError } from './supabaseClient';

/**
 * 現在のユーザーのデータをすべて削除し、サインアウトする。
 *
 * DB側の delete_my_account() が以下を削除する:
 *   1. player_ratings（段位・プロフィール）
 *   2. moves（手番履歴）
 *   3. rooms（参加ルーム）
 *   4. auth.users（匿名認証レコード）
 *
 * 完了後、クライアントのセッションをクリアする。
 */
export async function deleteMyAccount(): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw toNetworkError(error, 'アカウントの削除に失敗しました');

  // auth.users 削除後にローカルセッションをクリア
  await supabase.auth.signOut();
}
