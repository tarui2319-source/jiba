/**
 * @jest-environment jsdom
 *
 * useMatchmaking のユニットテスト。
 * roomService をモックして状態機械を検証する。
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import {
  findOrCreateRoom,
  pollRoomStatus,
  deleteOwnWaitingRoom,
} from '../../network/roomService';
import { MatchResult } from '../../network/networkTypes';

// ──────────────────────────────────────────────────────────────
// モックセットアップ
// ──────────────────────────────────────────────────────────────

jest.mock('../../network/roomService', () => ({
  findOrCreateRoom:      jest.fn(),
  pollRoomStatus:        jest.fn(),
  deleteOwnWaitingRoom:  jest.fn(),
  closeRoom:             jest.fn(),
}));

/** マイクロタスクキューを空にする（jsdom/node 両対応） */
function flushPromises() {
  return Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  (deleteOwnWaitingRoom as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// ──────────────────────────────────────────────────────────────
// 正常系
// ──────────────────────────────────────────────────────────────

describe('useMatchmaking', () => {
  describe('正常系', () => {
    it('BLUE パス: searching → matched（即座）', async () => {
      const blueResult: MatchResult = {
        roomId: 'room-1', myPlayer: 'first', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(blueResult);

      const { result } = renderHook(() => useMatchmaking());
      expect(result.current.matchState.status).toBe('idle');

      act(() => { result.current.startMatchmaking('quick'); });
      expect(result.current.matchState.status).toBe('searching');

      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('matched');
      if (result.current.matchState.status === 'matched') {
        expect(result.current.matchState.result).toEqual(blueResult);
      }
    });

    it('RED パス: searching → waiting_for_opponent → matched（ポーリング解決）', async () => {
      const redResult: MatchResult = {
        roomId: 'room-2', myPlayer: 'second', mode: 'standard', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(redResult);
      // 1回目の即時ポーリングは 'waiting'（中間状態を観察できるように）
      // 2回目以降は 'playing'
      (pollRoomStatus as jest.Mock)
        .mockResolvedValueOnce('waiting')
        .mockResolvedValue('playing');

      const { result } = renderHook(() => useMatchmaking());

      act(() => { result.current.startMatchmaking('standard'); });
      await act(async () => { await flushPromises(); });

      // 1回目ポーリング（'waiting'）後は waiting_for_opponent のまま
      expect(result.current.matchState.status).toBe('waiting_for_opponent');

      // 2秒後のインターバルポーリングで 'playing' → matched
      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await flushPromises();
      });

      expect(result.current.matchState.status).toBe('matched');
      if (result.current.matchState.status === 'matched') {
        expect(result.current.matchState.result.myPlayer).toBe('second');
      }
    });

    it('waiting_for_opponent → polling が waiting を返している間は状態変化しない', async () => {
      const redResult: MatchResult = {
        roomId: 'room-3', myPlayer: 'second', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(redResult);
      (pollRoomStatus as jest.Mock)
        .mockResolvedValueOnce('waiting')
        .mockResolvedValueOnce('waiting')
        .mockResolvedValue('playing');

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('waiting_for_opponent');

      // 3 回目のポーリングで playing
      await act(async () => {
        jest.advanceTimersByTime(4_000); // 2 intervals
        await flushPromises();
      });

      expect(result.current.matchState.status).toBe('matched');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 異常系
  // ──────────────────────────────────────────────────────────────

  describe('異常系', () => {
    it('findOrCreateRoom で DB エラー → error 状態', async () => {
      (findOrCreateRoom as jest.Mock).mockRejectedValue(new Error('DB connection error'));

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('error');
    });

    it('ROOM_TAKEN: 1 回自動リトライして成功すれば matched', async () => {
      const blueResult: MatchResult = {
        roomId: 'room-5', myPlayer: 'first', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock)
        .mockRejectedValueOnce(new Error('ROOM_TAKEN'))
        .mockResolvedValue(blueResult);

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('matched');
      expect(findOrCreateRoom).toHaveBeenCalledTimes(2);
    });

    it('ROOM_TAKEN × 2 回: リトライ後も失敗 → error', async () => {
      (findOrCreateRoom as jest.Mock)
        .mockRejectedValueOnce(new Error('ROOM_TAKEN'))
        .mockRejectedValueOnce(new Error('ROOM_TAKEN'));

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('error');
    });

    it('60 秒タイムアウト → error', async () => {
      const redResult: MatchResult = {
        roomId: 'room-6', myPlayer: 'second', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(redResult);
      (pollRoomStatus as jest.Mock).mockResolvedValue('waiting');

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('waiting_for_opponent');

      await act(async () => {
        jest.advanceTimersByTime(60_001);
        await flushPromises();
      });

      expect(result.current.matchState.status).toBe('error');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────

  describe('境界値', () => {
    it('idle 時の cancelMatchmaking は no-op（エラーにならない）', () => {
      const { result } = renderHook(() => useMatchmaking());
      expect(result.current.matchState.status).toBe('idle');

      // エラーにならないことを確認
      act(() => { result.current.cancelMatchmaking(); });
      expect(result.current.matchState.status).toBe('idle');
    });

    it('cancelMatchmaking: waiting_for_opponent 時に deleteOwnWaitingRoom を呼ぶ', async () => {
      const redResult: MatchResult = {
        roomId: 'room-7', myPlayer: 'second', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(redResult);
      (pollRoomStatus as jest.Mock).mockResolvedValue('waiting');

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('waiting_for_opponent');

      act(() => { result.current.cancelMatchmaking(); });
      await act(async () => { await flushPromises(); });

      expect(result.current.matchState.status).toBe('idle');
      expect(deleteOwnWaitingRoom).toHaveBeenCalledWith('room-7');
    });

    it('cancelMatchmaking 後は状態が idle に戻る', async () => {
      const redResult: MatchResult = {
        roomId: 'room-8', myPlayer: 'second', mode: 'quick', nextOpponentSeq: 0,
      };
      (findOrCreateRoom as jest.Mock).mockResolvedValue(redResult);
      (pollRoomStatus as jest.Mock).mockResolvedValue('waiting');

      const { result } = renderHook(() => useMatchmaking());
      act(() => { result.current.startMatchmaking('quick'); });
      await act(async () => { await flushPromises(); });

      act(() => { result.current.cancelMatchmaking(); });

      expect(result.current.matchState.status).toBe('idle');
    });
  });
});
