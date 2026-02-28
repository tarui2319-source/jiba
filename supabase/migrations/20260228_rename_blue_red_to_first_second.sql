-- JIBA: rooms.blue_id / red_id → first_id / second_id
-- moves.player の CHECK制約・既存値も更新
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて Run
-- 注意: 本番環境ではバックアップ後に実行すること

-- ────────────────────────────────────────────────────────────────
-- 1. rooms テーブル: カラム名変更
-- ────────────────────────────────────────────────────────────────

ALTER TABLE rooms RENAME COLUMN blue_id TO first_id;
ALTER TABLE rooms RENAME COLUMN red_id  TO second_id;

-- ────────────────────────────────────────────────────────────────
-- 2. moves テーブル: CHECK制約の更新 + 既存データの値変換
-- ────────────────────────────────────────────────────────────────

-- 既存の CHECK制約を削除（制約名は環境によって異なる場合あり）
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'moves'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%blue%red%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE moves DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END
$$;

-- 既存行の値を変換
UPDATE moves SET player = 'first'  WHERE player = 'blue';
UPDATE moves SET player = 'second' WHERE player = 'red';

-- 新しい CHECK制約を追加
ALTER TABLE moves
  ADD CONSTRAINT moves_player_check CHECK (player IN ('first', 'second'));

-- ────────────────────────────────────────────────────────────────
-- 3. RLS ポリシーの確認用クエリ（参考: 手動確認用、実行不要）
-- ────────────────────────────────────────────────────────────────
-- blue_id / red_id を参照しているポリシーがあれば手動で更新すること:
--
--   SELECT policyname, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('rooms', 'moves')
--     AND (qual::text LIKE '%blue%' OR qual::text LIKE '%red%'
--          OR with_check::text LIKE '%blue%' OR with_check::text LIKE '%red%');

-- ────────────────────────────────────────────────────────────────
-- 4. 変更確認クエリ
-- ────────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'rooms' ORDER BY ordinal_position;
--
-- SELECT DISTINCT player FROM moves;
