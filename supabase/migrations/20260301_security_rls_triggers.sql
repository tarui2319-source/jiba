-- JIBA: セキュリティ強化マイグレーション
-- RLS (Row Level Security) + moves バリデーショントリガー + CHECK 制約
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて Run
-- 注意: 本番環境ではバックアップ後に実行すること
--
-- 前提条件:
--   - Supabase Anonymous Auth が有効であること
--     (Dashboard > Authentication > Providers > Anonymous Sign-ins: Enabled)
--   - Realtime で RLS を有効にするには:
--     Dashboard > Realtime > Configuration > enable_authorization_checks: true
--
-- 型キャスト方針:
--   rooms.id が uuid 型、moves.room_id / player_id が text 型など
--   列の型が混在するため、比較はすべて ::text にキャストして統一する。

-- ────────────────────────────────────────────────────────────────
-- 1. moves テーブル: CHECK 制約追加
-- ────────────────────────────────────────────────────────────────

-- move_type 制約（既存があれば再作成）
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_type_check;
ALTER TABLE moves ADD CONSTRAINT moves_type_check
  CHECK (move_type IN ('build', 'stack', 'surrender'));

-- shape 制約（ShapeKind 7種 + NULL 許容: surrender では NULL の場合あり）
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_shape_check;
ALTER TABLE moves ADD CONSTRAINT moves_shape_check
  CHECK (shape IN (
    'weak', 'mid_cross', 'mid_diag',
    'strong_vert', 'strong_horiz',
    'strong_diag_nwse', 'strong_diag_nesw'
  ) OR shape IS NULL);

-- 座標範囲制約（最大ボードサイズ 9x9 = 0～8）
ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_row_check;
ALTER TABLE moves ADD CONSTRAINT moves_row_check
  CHECK (row >= 0 AND row <= 8);

ALTER TABLE moves DROP CONSTRAINT IF EXISTS moves_col_check;
ALTER TABLE moves ADD CONSTRAINT moves_col_check
  CHECK (col >= 0 AND col <= 8);

-- ────────────────────────────────────────────────────────────────
-- 2. moves バリデーショントリガー
--    player_id が該当ルームの参加者であること、ロール一致を強制
--    比較はすべて ::text にキャストして型差異を吸収する
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_move_insert()
RETURNS TRIGGER AS $$
DECLARE
  room_record RECORD;
BEGIN
  SELECT first_id::text, second_id::text, status
  INTO room_record
  FROM rooms
  WHERE id::text = NEW.room_id::text;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', NEW.room_id;
  END IF;

  IF room_record.status != 'playing' THEN
    RAISE EXCEPTION 'Room is not in playing status (current: %)', room_record.status;
  END IF;

  IF NEW.player_id::text != room_record.first_id::text
     AND NEW.player_id::text != room_record.second_id::text THEN
    RAISE EXCEPTION 'Player % is not a participant of room %', NEW.player_id, NEW.room_id;
  END IF;

  IF NEW.player = 'first' AND NEW.player_id::text != room_record.first_id::text THEN
    RAISE EXCEPTION 'Role mismatch: player=first but player_id != first_id';
  END IF;

  IF NEW.player = 'second' AND NEW.player_id::text != room_record.second_id::text THEN
    RAISE EXCEPTION 'Role mismatch: player=second but player_id != second_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存トリガーがあれば削除して再作成
DROP TRIGGER IF EXISTS moves_validate_before_insert ON moves;
CREATE TRIGGER moves_validate_before_insert
  BEFORE INSERT ON moves
  FOR EACH ROW EXECUTE FUNCTION validate_move_insert();

-- ────────────────────────────────────────────────────────────────
-- 3. RLS 有効化
-- ────────────────────────────────────────────────────────────────

ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves          ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 4. rooms RLS ポリシー
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rooms_select_all"           ON rooms;
DROP POLICY IF EXISTS "rooms_insert_as_second"     ON rooms;
DROP POLICY IF EXISTS "rooms_update_join_or_close" ON rooms;
DROP POLICY IF EXISTS "rooms_delete_own_waiting"   ON rooms;

-- 参照: マッチング検索のため全ルーム閲覧を許可（rooms にはプレイヤー UUID のみ）
CREATE POLICY "rooms_select_all"
  ON rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 作成: second_id が自分のみ INSERT 可
CREATE POLICY "rooms_insert_as_second"
  ON rooms FOR INSERT
  WITH CHECK (second_id::text = auth.uid()::text);

-- 更新: 参加者が更新可 OR waiting ルームへの新規参加（first_id が NULL の場合）
CREATE POLICY "rooms_update_join_or_close"
  ON rooms FOR UPDATE
  USING (
    second_id::text = auth.uid()::text
    OR first_id::text  = auth.uid()::text
    OR (first_id IS NULL AND status = 'waiting')
  )
  WITH CHECK (
    second_id::text = auth.uid()::text
    OR first_id::text = auth.uid()::text
  );

-- 削除: 自分が second_id かつ waiting 状態のルームのみ削除可
CREATE POLICY "rooms_delete_own_waiting"
  ON rooms FOR DELETE
  USING (second_id::text = auth.uid()::text AND status = 'waiting');

-- ────────────────────────────────────────────────────────────────
-- 5. moves RLS ポリシー
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "moves_select_participants" ON moves;
DROP POLICY IF EXISTS "moves_insert_participant"  ON moves;

-- 参照: ルームの参加者のみ閲覧可（Realtime も同一ポリシーが適用）
CREATE POLICY "moves_select_participants"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id::text = room_id::text
        AND (r.first_id::text = auth.uid()::text OR r.second_id::text = auth.uid()::text)
    )
  );

-- 挿入: player_id が自分、かつルームの参加者のみ
CREATE POLICY "moves_insert_participant"
  ON moves FOR INSERT
  WITH CHECK (
    player_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id::text = room_id::text
        AND r.status = 'playing'
        AND (r.first_id::text = auth.uid()::text OR r.second_id::text = auth.uid()::text)
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 6. player_ratings RLS ポリシー
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ratings_select_self" ON player_ratings;
DROP POLICY IF EXISTS "ratings_insert_self" ON player_ratings;
DROP POLICY IF EXISTS "ratings_update_self" ON player_ratings;

-- 参照: 自分の段位のみ読み取り可
CREATE POLICY "ratings_select_self"
  ON player_ratings FOR SELECT
  USING (player_id::text = auth.uid()::text);

-- 挿入: 自分の player_id のみ INSERT 可
CREATE POLICY "ratings_insert_self"
  ON player_ratings FOR INSERT
  WITH CHECK (player_id::text = auth.uid()::text);

-- 更新: 自分の行のみ UPDATE 可
CREATE POLICY "ratings_update_self"
  ON player_ratings FOR UPDATE
  USING (player_id::text = auth.uid()::text)
  WITH CHECK (player_id::text = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────
-- 7. 検証クエリ（確認用・実行不要）
-- ────────────────────────────────────────────────────────────────
-- -- RLS 有効確認:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('rooms', 'moves', 'player_ratings');
--
-- -- ポリシー一覧:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('rooms', 'moves', 'player_ratings')
-- ORDER BY tablename, policyname;
--
-- -- トリガー確認:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'moves';
