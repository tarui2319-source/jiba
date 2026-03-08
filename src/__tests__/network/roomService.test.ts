/**
 * roomService のユニットテスト。
 * Supabase クライアントをモックして純粋にロジックを検証する。
 */

import { findOrCreateRoom, pollRoomStatus, closeRoom, deleteOwnWaitingRoom } from '../../network/roomService';
import { getSupabaseClient } from '../../network/supabaseClient';

// ──────────────────────────────────────────────────────────────
// モックセットアップ
// ──────────────────────────────────────────────────────────────

jest.mock('../../network/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  MY_PLAYER_ID: 'my-player-uuid',
  toNetworkError: jest.fn((err: { message?: string } | null | undefined) =>
    new Error(err?.message ?? 'ネットワークエラーが発生しました'),
  ),
}));

/**
 * findOrCreateRoom 用モック。
 * roomService.ts の select チェーン:
 *   .select('*').eq(mode).eq(status).neq(second_id).gte(created_at).order().limit(1)
 *
 * 複数 .eq() をサポートするため、全メソッドが同じ queryChain を返すフルエントチェーンを使用。
 */
function mockForFindOrCreate({
  searchResult = null as Record<string, unknown> | null,
  searchError  = null as { message: string } | null,
  joinError    = null as { message: string } | null,
  insertedRoom = { id: 'created-room', mode: 'quick', status: 'waiting', second_id: 'my-player-uuid' } as Record<string, unknown>,
} = {}) {
  // ── select チェーン用フルエントオブジェクト ────────────────
  // roomService は .select().eq().eq().neq().gte().order().limit() と複数の
  // .eq() を連鎖させるため、全メソッドが同じ chain オブジェクトを返す。
  const limitFn  = jest.fn().mockResolvedValue({ data: searchResult ? [searchResult] : [], error: searchError });
  const orderFn  = jest.fn();
  const gteFn    = jest.fn();
  const neqFn    = jest.fn();
  const eqFn     = jest.fn();
  const selectFn = jest.fn();

  // フルエントチェーン: 各メソッドが queryChain を返す
  const queryChain = { eq: eqFn, neq: neqFn, gte: gteFn, order: orderFn, limit: limitFn };
  eqFn.mockReturnValue(queryChain);
  neqFn.mockReturnValue(queryChain);
  gteFn.mockReturnValue(queryChain);
  orderFn.mockReturnValue(queryChain);
  selectFn.mockReturnValue(queryChain);

  // ── insert().select().single() ────────────────────────────
  const insertSingle = jest.fn().mockResolvedValue({ data: insertedRoom, error: null });
  const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
  const insertFn     = jest.fn().mockReturnValue({ select: insertSelect });

  // ── update().eq().eq() ────────────────────────────────────
  const updateEq2 = jest.fn().mockResolvedValue({ error: joinError });
  const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
  const updateFn  = jest.fn().mockReturnValue({ eq: updateEq1 });

  const fromFn = jest.fn().mockReturnValue({
    select: selectFn,
    insert: insertFn,
    update: updateFn,
  });

  (getSupabaseClient as jest.Mock).mockReturnValue({ from: fromFn });

  return { fromFn, selectFn, eqFn, neqFn, gteFn, orderFn, insertSingle };
}

// ──────────────────────────────────────────────────────────────
// findOrCreateRoom — 正常系
// ──────────────────────────────────────────────────────────────

describe('findOrCreateRoom', () => {
  describe('正常系', () => {
    it('waiting ルームが見つかった場合、BLUE として参加する', async () => {
      const existingRoom = { id: 'room-1', mode: 'quick', status: 'waiting', second_id: 'other-player' };
      mockForFindOrCreate({ searchResult: existingRoom, joinError: null });

      const result = await findOrCreateRoom('quick');

      expect(result.myPlayer).toBe('first');
      expect(result.roomId).toBe('room-1');
      expect(result.mode).toBe('quick');
      expect(result.nextOpponentSeq).toBe(0);
    });

    it('waiting ルームがない場合、RED として新規作成する', async () => {
      const createdRoom = { id: 'room-2', mode: 'standard', status: 'waiting', second_id: 'my-player-uuid' };
      mockForFindOrCreate({ searchResult: null, insertedRoom: createdRoom });

      const result = await findOrCreateRoom('standard');

      expect(result.myPlayer).toBe('second');
      expect(result.roomId).toBe('room-2');
      expect(result.mode).toBe('standard');
    });

    it('pollRoomStatus が playing を返す', async () => {
      const singleFn = jest.fn().mockResolvedValue({ data: { status: 'playing' }, error: null });
      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: singleFn }),
          }),
        }),
      });

      const status = await pollRoomStatus('room-1');

      expect(status).toBe('playing');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 異常系
  // ──────────────────────────────────────────────────────────────

  describe('異常系', () => {
    it('DB エラーが発生した場合、エラーを伝播する', async () => {
      mockForFindOrCreate({ searchResult: null, searchError: { message: 'DB connection error' } });

      await expect(findOrCreateRoom('quick')).rejects.toThrow('DB connection error');
    });

    it('競合でジョインに失敗した場合、ROOM_TAKEN エラーを投げる', async () => {
      const existingRoom = { id: 'room-1', mode: 'quick', status: 'waiting', second_id: 'other-player' };
      mockForFindOrCreate({
        searchResult: existingRoom,
        joinError: { message: 'conflict' },
      });

      await expect(findOrCreateRoom('quick')).rejects.toThrow('ROOM_TAKEN');
    });

    it('pollRoomStatus で DB エラーが起きた場合、エラーを投げる', async () => {
      const singleFn = jest.fn().mockResolvedValue({ data: null, error: { message: 'poll error' } });
      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: singleFn }),
          }),
        }),
      });

      await expect(pollRoomStatus('room-1')).rejects.toThrow('poll error');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────

  describe('境界値', () => {
    it('スタール（5分超）ルームを除外するため gte フィルターが呼ばれる', async () => {
      const { gteFn } = mockForFindOrCreate({ searchResult: null });

      await findOrCreateRoom('quick');

      expect(gteFn).toHaveBeenCalledWith('created_at', expect.any(String));
    });

    it('自分のルームには参加しないため neq フィルターが呼ばれる', async () => {
      const { neqFn } = mockForFindOrCreate({ searchResult: null });

      await findOrCreateRoom('quick');

      expect(neqFn).toHaveBeenCalledWith('second_id', 'my-player-uuid');
    });

    it('closeRoom は finished ルームに対しても例外を投げない', async () => {
      const eqFn = jest.fn().mockResolvedValue({ error: null });
      const updateFn = jest.fn().mockReturnValue({ eq: eqFn });
      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({ update: updateFn }),
      });

      await expect(closeRoom('room-1')).resolves.toBeUndefined();
    });
  });
});

// ──────────────────────────────────────────────────────────────
// deleteOwnWaitingRoom
// ──────────────────────────────────────────────────────────────

describe('deleteOwnWaitingRoom', () => {
  it('id・second_id・status のガードを付けて DELETE を呼ぶ', async () => {
    // delete().eq('id').eq('second_id').eq('status')
    const eq3 = jest.fn().mockResolvedValue({ error: null });
    const eq2 = jest.fn().mockReturnValue({ eq: eq3 });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const deleteFn = jest.fn().mockReturnValue({ eq: eq1 });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ delete: deleteFn }),
    });

    await deleteOwnWaitingRoom('room-1');

    // チェーン順: .eq('id','room-1') → .eq('second_id','my-player-uuid') → .eq('status','waiting')
    expect(eq1).toHaveBeenCalledWith('id', 'room-1');
    expect(eq2).toHaveBeenCalledWith('second_id', 'my-player-uuid');
    expect(eq3).toHaveBeenCalledWith('status', 'waiting');
  });

  it('DB エラーが起きても例外を投げない（fire-and-forget）', async () => {
    const eq3 = jest.fn().mockResolvedValue({ error: { message: 'delete error' } });
    const eq2 = jest.fn().mockReturnValue({ eq: eq3 });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const deleteFn = jest.fn().mockReturnValue({ eq: eq1 });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ delete: deleteFn }),
    });

    // deleteOwnWaitingRoom は await するが error を throw しない
    await expect(deleteOwnWaitingRoom('room-1')).resolves.toBeUndefined();
  });
});
