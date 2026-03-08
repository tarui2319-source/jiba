/**
 * moveService のユニットテスト。
 * Supabase クライアントをモックして純粋にロジックを検証する。
 */

import {
  insertMove,
  insertSurrenderMove,
  subscribeToOpponentMoves,
  fetchExistingMoves,
  moveRowToAction,
  ChannelStatus,
} from '../../network/moveService';
import { getSupabaseClient } from '../../network/supabaseClient';
import { MoveRow } from '../../network/networkTypes';

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

/** Realtime 手番コールバックをキャプチャ */
let capturedCallback: ((payload: { new: MoveRow }) => void) | null = null;
/** Realtime status コールバックをキャプチャ */
let capturedStatusCb: ((status: string) => void) | null = null;

/** channelMock: on/subscribe/unsubscribe を持つ */
function buildChannelMock() {
  const channel: {
    on: jest.Mock;
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
  } = {
    subscribe: jest.fn().mockImplementation((cb?: (s: string) => void) => {
      if (cb) capturedStatusCb = cb;
      return channel;
    }),
    unsubscribe: jest.fn(),
    on: jest.fn(),
  };
  channel.on.mockImplementation((_event: unknown, _filter: unknown, callback: (p: { new: MoveRow }) => void) => {
    capturedCallback = callback;
    return channel; // チェーン可能
  });
  return channel;
}

// ──────────────────────────────────────────────────────────────
// insertMove
// ──────────────────────────────────────────────────────────────

describe('insertMove', () => {
  function mockInsert(error: { message: string } | null = null) {
    const insertFn = jest.fn().mockResolvedValue({ error });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: insertFn }),
    });
    return insertFn;
  }

  describe('正常系', () => {
    it('正しい行形式を DB に送信する', async () => {
      const insertFn = mockInsert(null);

      await insertMove('room-1', 'first', 0, {
        type: 'build', row: 2, col: 3, shape: 'weak',
      });

      expect(insertFn).toHaveBeenCalledWith({
        room_id: 'room-1',
        player: 'first',
        player_id: 'my-player-uuid',
        seq: 0,
        move_type: 'build',
        row: 2,
        col: 3,
        shape: 'weak',
      });
    });

    it('stack タイプの手番も正しく送信する', async () => {
      const insertFn = mockInsert(null);

      await insertMove('room-2', 'second', 1, {
        type: 'stack', row: 0, col: 0, shape: 'strong_vert',
      });

      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
        move_type: 'stack',
        player: 'second',
        seq: 1,
        shape: 'strong_vert',
      }));
    });
  });

  describe('異常系', () => {
    it('DB エラーが発生した場合、エラーを投げる', async () => {
      mockInsert({ message: 'insert error' });

      await expect(insertMove('room-1', 'first', 0, {
        type: 'build', row: 0, col: 0, shape: 'weak',
      })).rejects.toThrow('insert error');
    });
  });

  describe('境界値', () => {
    it('seq=0 の最初の手番を正しく送信する', async () => {
      const insertFn = mockInsert(null);

      await insertMove('room-1', 'first', 0, { type: 'build', row: 0, col: 0, shape: 'weak' });

      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ seq: 0 }));
    });

    it('seq=35 の最終手番（standard mode）を送信できる', async () => {
      const insertFn = mockInsert(null);

      await insertMove('room-1', 'second', 35, { type: 'build', row: 8, col: 8, shape: 'weak' });

      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ seq: 35 }));
    });
  });
});

// ──────────────────────────────────────────────────────────────
// insertSurrenderMove
// ──────────────────────────────────────────────────────────────

describe('insertSurrenderMove', () => {
  function mockInsert(error: { message: string } | null = null) {
    const insertFn = jest.fn().mockResolvedValue({ error });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: insertFn }),
    });
    return insertFn;
  }

  it('move_type=surrender で DB に送信する', async () => {
    const insertFn = mockInsert(null);

    await insertSurrenderMove('room-1', 'first', 5);

    expect(insertFn).toHaveBeenCalledWith({
      room_id: 'room-1',
      player: 'first',
      player_id: 'my-player-uuid',
      seq: 5,
      move_type: 'surrender',
      row: 0,
      col: 0,
      shape: 'weak',
    });
  });

  it('DB エラーが発生した場合、エラーを投げる', async () => {
    mockInsert({ message: 'surrender insert error' });

    await expect(insertSurrenderMove('room-1', 'second', 3)).rejects.toThrow('surrender insert error');
  });
});

// ──────────────────────────────────────────────────────────────
// subscribeToOpponentMoves
// ──────────────────────────────────────────────────────────────

describe('subscribeToOpponentMoves', () => {
  beforeEach(() => { capturedCallback = null; capturedStatusCb = null; });

  function mockChannel() {
    const ch = buildChannelMock();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      channel: jest.fn().mockReturnValue(ch),
    });
    return ch;
  }

  describe('正常系', () => {
    it('相手プレイヤーの手番のみコールバックを呼ぶ', () => {
      mockChannel();
      const onMove = jest.fn();

      subscribeToOpponentMoves('room-1', 'first', onMove);

      // 相手（red）の手番 → コールバックが呼ばれる
      capturedCallback!({ new: { player: 'second', seq: 1 } as MoveRow });
      expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('自分の echo（player === myPlayer）は無視する', () => {
      mockChannel();
      const onMove = jest.fn();

      subscribeToOpponentMoves('room-1', 'first', onMove);

      // 自分（blue）の echo → コールバックは呼ばれない
      capturedCallback!({ new: { player: 'first', seq: 0 } as MoveRow });
      expect(onMove).not.toHaveBeenCalled();
    });

    it('チャンネルオブジェクトを返す（cleanup 用）', () => {
      const ch = mockChannel();

      const channel = subscribeToOpponentMoves('room-1', 'first', jest.fn());

      expect(channel).toBe(ch);
    });
  });

  describe('異常系', () => {
    it('red として購読したとき自分（red）の echo は無視し、blue のみコールバック', () => {
      mockChannel();
      const onMove = jest.fn();

      subscribeToOpponentMoves('room-1', 'second', onMove);

      capturedCallback!({ new: { player: 'first', seq: 0 } as MoveRow });
      expect(onMove).toHaveBeenCalledTimes(1);

      capturedCallback!({ new: { player: 'second', seq: 1 } as MoveRow });
      expect(onMove).toHaveBeenCalledTimes(1); // red の echo は無視
    });
  });

  describe('境界値', () => {
    it('seq=0 の最初の手番もコールバックを呼ぶ', () => {
      mockChannel();
      const onMove = jest.fn();

      subscribeToOpponentMoves('room-1', 'first', onMove);

      capturedCallback!({ new: { player: 'second', seq: 0 } as MoveRow });
      expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ seq: 0 }));
    });
  });

  // ──────────────────────────────────────────────────────────────
  // onStatusChange コールバック（再接続対応）
  // ──────────────────────────────────────────────────────────────

  describe('onStatusChange', () => {
    it('SUBSCRIBED ステータスで onStatusChange コールバックが呼ばれる', () => {
      mockChannel();
      const onStatusChange = jest.fn();

      subscribeToOpponentMoves('room-1', 'first', jest.fn(), onStatusChange);

      capturedStatusCb!('SUBSCRIBED');
      expect(onStatusChange).toHaveBeenCalledWith('SUBSCRIBED' as ChannelStatus);
    });

    it('CHANNEL_ERROR ステータスで onStatusChange コールバックが呼ばれる', () => {
      mockChannel();
      const onStatusChange = jest.fn();

      subscribeToOpponentMoves('room-1', 'first', jest.fn(), onStatusChange);

      capturedStatusCb!('CHANNEL_ERROR');
      expect(onStatusChange).toHaveBeenCalledWith('CHANNEL_ERROR' as ChannelStatus);
    });

    it('onStatusChange 省略時でもエラーにならない（後方互換）', () => {
      mockChannel();

      // 4 引数なしで呼び出し
      expect(() => {
        subscribeToOpponentMoves('room-1', 'first', jest.fn());
        capturedStatusCb!('SUBSCRIBED'); // status callback を発火しても OK
      }).not.toThrow();
    });
  });
});

// ──────────────────────────────────────────────────────────────
// fetchExistingMoves
// ──────────────────────────────────────────────────────────────

describe('fetchExistingMoves', () => {
  function mockSelect(data: Partial<MoveRow>[], error: { message: string } | null = null) {
    const orderFn = jest.fn().mockResolvedValue({ data, error });
    const eqFn = jest.fn().mockReturnValue({ order: orderFn });
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ select: selectFn }),
    });
    return orderFn;
  }

  describe('正常系', () => {
    it('seq 昇順で全手番を返す', async () => {
      const moves: Partial<MoveRow>[] = [
        { id: 1, seq: 0, player: 'first' as const },
        { id: 2, seq: 1, player: 'second' as const },
      ];
      const orderFn = mockSelect(moves);

      const result = await fetchExistingMoves('room-1');

      expect(result).toHaveLength(2);
      expect(orderFn).toHaveBeenCalledWith('seq', { ascending: true });
    });

    it('手番がない場合は空配列を返す', async () => {
      mockSelect([]);

      const result = await fetchExistingMoves('room-1');

      expect(result).toEqual([]);
    });
  });

  describe('異常系', () => {
    it('DB エラーが発生した場合、エラーを投げる', async () => {
      mockSelect([], { message: 'fetch error' });

      await expect(fetchExistingMoves('room-1')).rejects.toThrow('fetch error');
    });
  });

  describe('境界値', () => {
    it('null が返ってきた場合も空配列にフォールバックする', async () => {
      // Supabase が data:null を返す場合
      const orderFn = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqFn = jest.fn().mockReturnValue({ order: orderFn });
      const selectFn = jest.fn().mockReturnValue({ eq: eqFn });
      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({ select: selectFn }),
      });

      const result = await fetchExistingMoves('room-1');
      expect(result).toEqual([]);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// moveRowToAction
// ──────────────────────────────────────────────────────────────

describe('moveRowToAction', () => {
  describe('正常系', () => {
    it('MoveRow を Action に正しく変換する', () => {
      const row: MoveRow = {
        id: 1, room_id: 'r', player: 'first', player_id: 'p',
        seq: 0, move_type: 'build', row: 3, col: 4, shape: 'mid_cross',
        created_at: '2026-01-01',
      };

      expect(moveRowToAction(row)).toEqual({ type: 'build', row: 3, col: 4, shape: 'mid_cross' });
    });

    it('stack タイプも正しく変換する', () => {
      const row: MoveRow = {
        id: 2, room_id: 'r', player: 'second', player_id: 'p',
        seq: 1, move_type: 'stack', row: 0, col: 0, shape: 'strong_vert',
        created_at: '2026-01-01',
      };

      const action = moveRowToAction(row);
      expect(action.type).toBe('stack');
      expect(action.shape).toBe('strong_vert');
    });
  });
});
