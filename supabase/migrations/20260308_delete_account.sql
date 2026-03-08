-- JIBA: アカウント削除機能
-- delete_my_account() — 認証済みユーザーが自分のデータを完全削除する関数
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて Run
--
-- 設計方針:
--   - SECURITY DEFINER で postgres 権限で実行し、RLS・ポリシー制限を回避する
--   - auth.uid() は呼び出し元ユーザーの JWT から取得する（なりすまし不可）
--   - 削除順: player_ratings → moves → rooms → auth.users（参照整合性の逆順）
--   - authenticated ロールのみ実行可（Anonymous Authユーザーは authenticated に属する）

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. 段位・プロフィールデータ削除
  DELETE FROM public.player_ratings
  WHERE player_id::text = _uid::text;

  -- 2. 手番データ削除
  DELETE FROM public.moves
  WHERE player_id::text = _uid::text;

  -- 3. ルームデータ削除（自分が参加しているもの）
  DELETE FROM public.rooms
  WHERE first_id::text = _uid::text
     OR second_id::text = _uid::text;

  -- 4. auth.users から削除（匿名ユーザーの認証レコードを削除）
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- 実行権限: authenticated ロールのみ（Anonymous Auth は authenticated に属する）
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon;

-- ────────────────────────────────────────────────────────────────
-- 確認クエリ（実行不要）
-- ────────────────────────────────────────────────────────────────
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name = 'delete_my_account';
