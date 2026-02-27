/**
 * @jest-environment jsdom
 *
 * usePlayerRating のユニットテスト。
 * ratingService / supabaseClient をモックして React フックをテストする。
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePlayerRating } from '../../hooks/usePlayerRating';
import { fetchRating, upsertRating } from '../../network/ratingService';
import { GameResult } from '../../engine/types';
import { RatingRow } from '../../network/networkTypes';

// ──────────────────────────────────────────────────────────────
// モックセットアップ
// ──────────────────────────────────────────────────────────────

jest.mock('../../network/ratingService', () => ({
  fetchRating: jest.fn(),
  upsertRating: jest.fn(),
}));

jest.mock('../../network/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  MY_PLAYER_ID: 'test-player-uuid',
}));

const mockFetchRating = fetchRating as jest.Mock;
const mockUpsertRating = upsertRating as jest.Mock;

// ──────────────────────────────────────────────────────────────
// テストヘルパー
// ──────────────────────────────────────────────────────────────

const blueWin: GameResult = {
  winner: 'blue', blueCount: 30, redCount: 20, neutralCount: 5,
  bluePower: 100, redPower: 60,
};

const redWin: GameResult = {
  winner: 'red', blueCount: 15, redCount: 35, neutralCount: 5,
  bluePower: 50, redPower: 120,
};

const draw: GameResult = {
  winner: 'draw', blueCount: 25, redCount: 25, neutralCount: 5,
  bluePower: 80, redPower: 80,
};

const existingRow: RatingRow = {
  player_id: 'test-player-uuid', rank: 2, points: 40,
  wins: 3, losses: 1, draws: 0, updated_at: '2026-01-01',
};

// ──────────────────────────────────────────────────────────────
// 正常系
// ──────────────────────────────────────────────────────────────

describe('usePlayerRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsertRating.mockResolvedValue(undefined);
  });

  describe('正常系', () => {
    it('isOnlineGame=true でマウント時に fetchRating が呼ばれる', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePlayerRating({ gameResult: null, myPlayer: 'blue', isOnlineGame: true }),
      );

      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();

      expect(mockFetchRating).toHaveBeenCalledWith('test-player-uuid');
      expect(result.current.currentRating).toEqual({ rank: 2, points: 40 });
      expect(result.current.isLoading).toBe(false);
    });

    it('勝利後に upsertRating が呼ばれ currentRating が更新される', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { result, waitForNextUpdate, rerender } = renderHook(
        ({ gameResult, myPlayer }: { gameResult: GameResult | null; myPlayer: 'blue' | 'red' }) =>
          usePlayerRating({ gameResult, myPlayer, isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null, myPlayer: 'blue' as const } },
      );

      await waitForNextUpdate(); // fetchRating 完了

      // 勝利結果を渡す
      act(() => {
        rerender({ gameResult: blueWin, myPlayer: 'blue' });
      });

      // upsertRating が呼ばれる（非同期）
      await new Promise(r => setTimeout(r, 0));
      expect(mockUpsertRating).toHaveBeenCalledWith(
        expect.objectContaining({ rank: 2, points: 60 }), // 40 + 20
        'wins',
        existingRow,
      );
      // currentRating が更新される
      expect(result.current.currentRating?.points).toBe(60);
      // ratingDelta が設定される
      expect(result.current.ratingDelta?.pointsDelta).toBe(20);
      expect(result.current.ratingDelta?.direction).toBe('none');
    });

    it('resultAppliedRef: gameResult が同じ値のままでも二重に upsert しない', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ gameResult }: { gameResult: GameResult | null }) =>
          usePlayerRating({ gameResult, myPlayer: 'blue', isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null } },
      );

      await waitForNextUpdate();

      // 同じ gameResult を 2 回渡す
      act(() => { rerender({ gameResult: blueWin }); });
      act(() => { rerender({ gameResult: blueWin }); });

      await new Promise(r => setTimeout(r, 0));
      // upsertRating は 1 回のみ呼ばれる
      expect(mockUpsertRating).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    it('isOnlineGame=false なら fetchRating は呼ばれない', async () => {
      const { result } = renderHook(() =>
        usePlayerRating({ gameResult: null, myPlayer: 'blue', isOnlineGame: false }),
      );

      await new Promise(r => setTimeout(r, 10));

      expect(mockFetchRating).not.toHaveBeenCalled();
      expect(result.current.currentRating).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('upsertRating が失敗してもエラーをスローしない（fire-and-forget）', async () => {
      mockFetchRating.mockResolvedValue(existingRow);
      mockUpsertRating.mockRejectedValue(new Error('network error'));

      const { rerender, waitForNextUpdate } = renderHook(
        ({ gameResult }: { gameResult: GameResult | null }) =>
          usePlayerRating({ gameResult, myPlayer: 'blue', isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null } },
      );

      await waitForNextUpdate();

      // エラーが throw されないこと
      await expect(async () => {
        act(() => { rerender({ gameResult: blueWin }); });
        await new Promise(r => setTimeout(r, 10));
      }).not.toThrow();
    });

    it('fetchRating 失敗時はデフォルト値（1段 0P）にフォールバック', async () => {
      mockFetchRating.mockRejectedValue(new Error('connection error'));

      const { result, waitForNextUpdate } = renderHook(() =>
        usePlayerRating({ gameResult: null, myPlayer: 'blue', isOnlineGame: true }),
      );

      await waitForNextUpdate();

      expect(result.current.currentRating).toEqual({ rank: 1, points: 0 });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('境界値', () => {
    it('未登録プレイヤー（fetchRating=null）は DEFAULT_RATING を使う', async () => {
      mockFetchRating.mockResolvedValue(null);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePlayerRating({ gameResult: null, myPlayer: 'red', isOnlineGame: true }),
      );

      await waitForNextUpdate();

      expect(result.current.currentRating).toEqual({ rank: 1, points: 0 });
    });

    it('gameResult が null に戻ると ratingDelta がリセットされる', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ gameResult }: { gameResult: GameResult | null }) =>
          usePlayerRating({ gameResult, myPlayer: 'blue', isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null } },
      );

      await waitForNextUpdate();
      act(() => { rerender({ gameResult: blueWin }); });
      await new Promise(r => setTimeout(r, 0));
      expect(result.current.ratingDelta).not.toBeNull();

      // ゲームリセット（result=null）
      act(() => { rerender({ gameResult: null }); });
      expect(result.current.ratingDelta).toBeNull();
    });

    it('引き分けは draws をインクリメントし点数変化なし', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ gameResult }: { gameResult: GameResult | null }) =>
          usePlayerRating({ gameResult, myPlayer: 'blue', isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null } },
      );

      await waitForNextUpdate();
      act(() => { rerender({ gameResult: draw }); });
      await new Promise(r => setTimeout(r, 0));

      expect(mockUpsertRating).toHaveBeenCalledWith(
        expect.objectContaining({ rank: 2, points: 40 }),
        'draws',
        existingRow,
      );
    });

    it('myPlayer=red で相手（blue）が勝利 → losses', async () => {
      mockFetchRating.mockResolvedValue(existingRow);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ gameResult }: { gameResult: GameResult | null }) =>
          usePlayerRating({ gameResult, myPlayer: 'red', isOnlineGame: true }),
        { initialProps: { gameResult: null as GameResult | null } },
      );

      await waitForNextUpdate();
      act(() => { rerender({ gameResult: blueWin }); }); // red は負け
      await new Promise(r => setTimeout(r, 0));

      expect(mockUpsertRating).toHaveBeenCalledWith(
        expect.objectContaining({ points: 30 }), // 40 - 10
        'losses',
        existingRow,
      );
    });
  });
});
