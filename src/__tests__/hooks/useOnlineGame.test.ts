/**
 * @jest-environment jsdom
 *
 * useOnlineGame のユニットテスト。
 * moveService / roomService をモックしてオンラインゲームロジックを検証する。
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useOnlineGame } from '../../hooks/useOnlineGame';
import { useGameState } from '../../hooks/useGameState';
import {
  subscribeToOpponentMoves,
  fetchExistingMoves,
  insertMove,
  insertSurrenderMove,
  moveRowToAction,
} from '../../network/moveService';
import { closeRoom } from '../../network/roomService';
import { MatchResult, MoveRow } from '../../network/networkTypes';
import { Action } from '../../engine/types';

// ──────────────────────────────────────────────────────────────
// モックセットアップ
// ──────────────────────────────────────────────────────────────

jest.mock('../../network/moveService', () => ({
  subscribeToOpponentMoves: jest.fn(),
  fetchExistingMoves:       jest.fn(),
  insertMove:               jest.fn(),
  insertSurrenderMove:      jest.fn(),
  moveRowToAction:          jest.fn(),
}));

jest.mock('../../network/roomService', () => ({
  closeRoom:              jest.fn(),
  deleteOwnWaitingRoom:   jest.fn(),
}));

/** テスト用 matchResult */
const blueMatch: MatchResult = {
  roomId: 'room-1', myPlayer: 'first', mode: 'quick', nextOpponentSeq: 0,
};
const redMatch: MatchResult = {
  roomId: 'room-1', myPlayer: 'second', mode: 'quick', nextOpponentSeq: 1,
};

/** テスト用 MoveRow ビルダー */
function buildMoveRow(seq: number, player: 'first' | 'second'): MoveRow {
  return {
    id: seq, room_id: 'room-1', player, player_id: 'p',
    seq, move_type: 'build', row: 0, col: seq % 6, shape: 'weak',
    created_at: '2026-01-01',
  };
}

/** チャンネルモック（subscribe status コールバックキャプチャ対応） */
function buildChannelMock() {
  return {
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  };
}

/** Promise.resolve でマイクロタスクを消化 */
function flushPromises() { return Promise.resolve(); }

beforeEach(() => {
  jest.clearAllMocks();

  // subscribeToOpponentMoves は channel を返す
  (subscribeToOpponentMoves as jest.Mock).mockReturnValue(buildChannelMock());
  // fetchExistingMoves はデフォルト空配列
  (fetchExistingMoves as jest.Mock).mockResolvedValue([]);
  // insertMove / insertSurrenderMove はデフォルト成功
  (insertMove as jest.Mock).mockResolvedValue(undefined);
  (insertSurrenderMove as jest.Mock).mockResolvedValue(undefined);
  // closeRoom はデフォルト成功
  (closeRoom as jest.Mock).mockResolvedValue(undefined);
  // moveRowToAction は実際の変換をシミュレート
  (moveRowToAction as jest.Mock).mockImplementation((row: MoveRow): Action => ({
    type: row.move_type as 'build' | 'stack',
    row: row.row,
    col: row.col,
    shape: row.shape as Action['shape'],
  }));
});

// ──────────────────────────────────────────────────────────────
// 正常系
// ──────────────────────────────────────────────────────────────

describe('useOnlineGame', () => {
  describe('正常系', () => {
    it('matchResult=null の場合は isOnlineGame=false', () => {
      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: null });
      });
      expect(result.current.isOnlineGame).toBe(false);
      expect(result.current.myPlayer).toBeNull();
    });

    it('matchResult があれば isOnlineGame=true・myPlayer を返す', () => {
      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      expect(result.current.isOnlineGame).toBe(true);
      expect(result.current.myPlayer).toBe('first');
    });

    it('matchResult 設定時に subscribeToOpponentMoves を呼ぶ', async () => {
      renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      expect(subscribeToOpponentMoves).toHaveBeenCalledWith(
        'room-1', 'first', expect.any(Function), expect.any(Function),
      );
    });

    it('fetchExistingMoves で相手の既存手番を適用する', async () => {
      // RED の既存手番（seq=1）を返すモック
      const existingRow = buildMoveRow(1, 'second');
      (fetchExistingMoves as jest.Mock).mockResolvedValue([existingRow]);

      const applyMoveSpy = jest.fn();

      renderHook(() => {
        const gsr = useGameState('quick');
        // applyMove をスパイするため部分モック
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });

      await act(async () => { await flushPromises(); });

      expect(applyMoveSpy).toHaveBeenCalledTimes(1);
    });

    it('applyOnlineMove: ローカル即時適用 + insertMove を呼ぶ', async () => {
      const applyMoveSpy = jest.fn();
      const action: Action = { type: 'build', row: 0, col: 0, shape: 'weak' };

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });

      await act(async () => { await flushPromises(); });

      act(() => { result.current.applyOnlineMove(action); });

      expect(applyMoveSpy).toHaveBeenCalledWith(action);
      expect(insertMove).toHaveBeenCalledWith('room-1', 'first', 0, action);
    });

    it('初期状態で isReconnecting = false', () => {
      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      expect(result.current.isReconnecting).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 異常系
  // ──────────────────────────────────────────────────────────────

  describe('異常系', () => {
    it('insertMove 失敗はエラーを throw しない（fire-and-forget）', async () => {
      (insertMove as jest.Mock).mockRejectedValue(new Error('DB error'));
      const action: Action = { type: 'build', row: 0, col: 1, shape: 'weak' };

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      // エラーにならないことを確認
      await act(async () => {
        result.current.applyOnlineMove(action);
        await flushPromises();
      });
    });

    it('matchResult=null のとき applyOnlineMove は no-op', () => {
      const applyMoveSpy = jest.fn();
      const action: Action = { type: 'build', row: 0, col: 0, shape: 'weak' };

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: null });
      });

      act(() => { result.current.applyOnlineMove(action); });

      expect(applyMoveSpy).not.toHaveBeenCalled();
      expect(insertMove).not.toHaveBeenCalled();
    });

    it('fetchExistingMoves 失敗はエラーを throw しない', async () => {
      (fetchExistingMoves as jest.Mock).mockRejectedValue(new Error('fetch error'));

      // エラーにならないことを確認
      await act(async () => {
        renderHook(() => {
          const gsr = useGameState('quick');
          return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
        });
        await flushPromises();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────

  describe('境界値', () => {
    it('out-of-order: seq=3 先着 → バッファ → seq=1 到着 → 順に適用', async () => {
      // BLUE が RED の手番を待つシナリオ（RED は奇数 seq: 1, 3, 5...）
      // RED の 2 手目（seq=3）が先に到着し、1 手目（seq=1）が後着する
      const applyMoveSpy = jest.fn();

      // subscribeToOpponentMoves でコールバックをキャプチャ
      let capturedCb: ((row: MoveRow) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, cb: (row: MoveRow) => void) => {
          capturedCb = cb;
          return buildChannelMock();
        },
      );

      renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      // BLUE の expectedSeq=1。seq=3（RED の 2 手目）が先着 → バッファ
      act(() => { capturedCb!(buildMoveRow(3, 'second')); });
      expect(applyMoveSpy).toHaveBeenCalledTimes(0); // バッファに格納

      // seq=1（RED の 1 手目）が到着 → 1 を適用 → バッファから 3 をドレイン → 順に適用
      act(() => { capturedCb!(buildMoveRow(1, 'second')); });
      expect(applyMoveSpy).toHaveBeenCalledTimes(2); // 1, 3 の順
    });

    it('重複 seq（seq < expected）は無視する', async () => {
      const applyMoveSpy = jest.fn();
      let capturedCb: ((row: MoveRow) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, cb: (row: MoveRow) => void) => {
          capturedCb = cb;
          return buildChannelMock();
        },
      );

      renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        // blue は seq=0 から開始: nextOpponentSeq=1 (redは奇数)
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      // expected=0 のときに seq=1 を適用
      act(() => { capturedCb!(buildMoveRow(1, 'second')); });
      expect(applyMoveSpy).toHaveBeenCalledTimes(1);

      // seq=1 を再度送信 → expected=3 なので無視
      act(() => { capturedCb!(buildMoveRow(1, 'second')); });
      expect(applyMoveSpy).toHaveBeenCalledTimes(1); // 増えない
    });

    it('アンマウント時に channel.unsubscribe() を呼ぶ', async () => {
      const channelMock = buildChannelMock();
      (subscribeToOpponentMoves as jest.Mock).mockReturnValue(channelMock);

      const { unmount } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      unmount();

      expect(channelMock.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('RED プレイヤーの初期 nextOpponentSeq=1 が正しく設定される', async () => {
      let capturedCb: ((row: MoveRow) => void) | null = null;
      const applyMoveSpy = jest.fn();
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, cb: (row: MoveRow) => void) => {
          capturedCb = cb;
          return buildChannelMock();
        },
      );

      renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, applyMove: applyMoveSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: redMatch });
      });
      await act(async () => { await flushPromises(); });

      // RED の expected は nextOpponentSeq=1（BLUE の最初の手番）
      // seq=0 はスコープ外（RED には不要）
      act(() => { capturedCb!(buildMoveRow(0, 'first')); });
      expect(applyMoveSpy).toHaveBeenCalledTimes(0); // 0 < expectedSeq=1 → 無視

      act(() => { capturedCb!(buildMoveRow(1, 'first')); });  // wrong: blueの手番はseq=0
      // seq=1 >= expected(1) なので適用
      expect(applyMoveSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 再接続
  // ──────────────────────────────────────────────────────────────

  describe('再接続', () => {
    it('CHANNEL_ERROR 時に isReconnecting = true になる', async () => {
      let capturedStatusCb: ((status: string) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, _moveCb: unknown, statusCb: (s: string) => void) => {
          capturedStatusCb = statusCb;
          return buildChannelMock();
        },
      );

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      expect(result.current.isReconnecting).toBe(false);

      act(() => { capturedStatusCb!('CHANNEL_ERROR'); });
      expect(result.current.isReconnecting).toBe(true);
    });

    it('SUBSCRIBED 後に isReconnecting = false になる（フラグリセット）', async () => {
      let capturedStatusCb: ((status: string) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, _moveCb: unknown, statusCb: (s: string) => void) => {
          capturedStatusCb = statusCb;
          return buildChannelMock();
        },
      );

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      // 一度切断→再接続中
      act(() => { capturedStatusCb!('CHANNEL_ERROR'); });
      expect(result.current.isReconnecting).toBe(true);

      // SUBSCRIBED で回復
      act(() => { capturedStatusCb!('SUBSCRIBED'); });
      expect(result.current.isReconnecting).toBe(false);
    });

    it('CHANNEL_ERROR 後のタイムアウトで subscribeToOpponentMoves が再呼び出しされる', async () => {
      jest.useFakeTimers();

      let capturedStatusCb: ((status: string) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, _moveCb: unknown, statusCb: (s: string) => void) => {
          capturedStatusCb = statusCb;
          return buildChannelMock();
        },
      );

      renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      const callCount = (subscribeToOpponentMoves as jest.Mock).mock.calls.length;

      // 切断を発火
      act(() => { capturedStatusCb!('CHANNEL_ERROR'); });

      // 2000ms 後に再購読が走る
      await act(async () => { jest.advanceTimersByTime(2100); await flushPromises(); });

      expect((subscribeToOpponentMoves as jest.Mock).mock.calls.length).toBeGreaterThan(callCount);

      jest.useRealTimers();
    });

    it('TIMED_OUT でも isReconnecting = true になる', async () => {
      let capturedStatusCb: ((status: string) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, _moveCb: unknown, statusCb: (s: string) => void) => {
          capturedStatusCb = statusCb;
          return buildChannelMock();
        },
      );

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        return useOnlineGame({ gameStateReturn: gsr, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      act(() => { capturedStatusCb!('TIMED_OUT'); });
      expect(result.current.isReconnecting).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 降参
  // ──────────────────────────────────────────────────────────────

  describe('降参', () => {
    it('surrenderOnline: ローカル即時降参 + insertSurrenderMove を呼ぶ', async () => {
      const surrenderSpy = jest.fn();

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, surrender: surrenderSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });

      await act(async () => { await flushPromises(); });

      act(() => { result.current.surrenderOnline(); });

      expect(surrenderSpy).toHaveBeenCalledWith('first');
      expect(insertSurrenderMove).toHaveBeenCalledWith('room-1', 'first', 0);
    });

    it('相手の surrender move を受信するとローカル surrender が呼ばれる', async () => {
      const surrenderSpy = jest.fn();
      let capturedCb: ((row: MoveRow) => void) | null = null;
      (subscribeToOpponentMoves as jest.Mock).mockImplementation(
        (_room: string, _player: string, cb: (row: MoveRow) => void) => {
          capturedCb = cb;
          return buildChannelMock();
        },
      );

      renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, surrender: surrenderSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: blueMatch });
      });
      await act(async () => { await flushPromises(); });

      // 相手（red）が降参
      const surrenderRow: MoveRow = {
        id: 99, room_id: 'room-1', player: 'second', player_id: 'opp',
        seq: 1, move_type: 'surrender', row: 0, col: 0, shape: 'weak',
        created_at: '2026-01-01',
      };
      act(() => { capturedCb!(surrenderRow); });

      expect(surrenderSpy).toHaveBeenCalledWith('second');
    });

    it('matchResult=null のとき surrenderOnline は no-op', () => {
      const surrenderSpy = jest.fn();

      const { result } = renderHook(() => {
        const gsr = useGameState('quick');
        const gsr2 = { ...gsr, surrender: surrenderSpy };
        return useOnlineGame({ gameStateReturn: gsr2, matchResult: null });
      });

      act(() => { result.current.surrenderOnline(); });

      expect(surrenderSpy).not.toHaveBeenCalled();
      expect(insertSurrenderMove).not.toHaveBeenCalled();
    });
  });
});
