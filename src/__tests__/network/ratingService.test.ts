/**
 * ratingService のユニットテスト。
 * Supabase クライアントをモックして純粋にロジックを検証する。
 */

import { fetchRating, upsertRating } from '../../network/ratingService';
import { getSupabaseClient } from '../../network/supabaseClient';
import { RatingRow } from '../../network/networkTypes';

// ──────────────────────────────────────────────────────────────
// モックセットアップ
// ──────────────────────────────────────────────────────────────

jest.mock('../../network/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  MY_PLAYER_ID: 'test-player-uuid',
}));

// ──────────────────────────────────────────────────────────────
// fetchRating
// ──────────────────────────────────────────────────────────────

describe('fetchRating', () => {
  function mockSelect(data: RatingRow | null, error: { message: string; code?: string } | null = null) {
    const singleFn = jest.fn().mockResolvedValue({ data, error });
    const eqFn = jest.fn().mockReturnValue({ single: singleFn });
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ select: selectFn }),
    });
    return { singleFn, eqFn, selectFn };
  }

  describe('正常系', () => {
    it('プレイヤーの段位データを返す', async () => {
      const row: RatingRow = {
        player_id: 'test-player-uuid',
        rank: 3, points: 45,
        wins: 10, losses: 5, draws: 2,
        updated_at: '2026-01-01T00:00:00Z',
      };
      mockSelect(row);

      const result = await fetchRating('test-player-uuid');

      expect(result).toEqual(row);
    });

    it('PGRST116 エラー（未登録）の場合は null を返す', async () => {
      mockSelect(null, { message: 'no rows', code: 'PGRST116' });

      const result = await fetchRating('new-player-uuid');

      expect(result).toBeNull();
    });

    it('player_id の eq フィルターが正しく呼ばれる', async () => {
      const { eqFn } = mockSelect(null, { message: 'no rows', code: 'PGRST116' });

      await fetchRating('target-uuid');

      expect(eqFn).toHaveBeenCalledWith('player_id', 'target-uuid');
    });
  });

  describe('異常系', () => {
    it('DB エラー（PGRST116 以外）はエラーを投げる', async () => {
      mockSelect(null, { message: 'connection error', code: '500' });

      await expect(fetchRating('test-uuid')).rejects.toThrow('connection error');
    });

    it('エラーコードなしの DB エラーもエラーを投げる', async () => {
      mockSelect(null, { message: 'unexpected error' });

      await expect(fetchRating('test-uuid')).rejects.toThrow('unexpected error');
    });
  });

  describe('境界値', () => {
    it('rank=1, points=0 の初期値を正しく返す', async () => {
      const row: RatingRow = {
        player_id: 'p', rank: 1, points: 0,
        wins: 0, losses: 0, draws: 0,
        updated_at: '2026-01-01',
      };
      mockSelect(row);

      const result = await fetchRating('p');

      expect(result?.rank).toBe(1);
      expect(result?.points).toBe(0);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// upsertRating
// ──────────────────────────────────────────────────────────────

describe('upsertRating', () => {
  function mockUpsert(error: { message: string } | null = null) {
    const upsertFn = jest.fn().mockResolvedValue({ error });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({ upsert: upsertFn }),
    });
    return upsertFn;
  }

  describe('正常系', () => {
    it('新規プレイヤー（existingRow=null）の勝利: wins=1 で upsert する', async () => {
      const upsertFn = mockUpsert(null);

      await upsertRating({ rank: 1, points: 20 }, 'wins', null);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          player_id: 'test-player-uuid',
          rank: 1,
          points: 20,
          wins: 1,
          losses: 0,
          draws: 0,
        }),
        { onConflict: 'player_id' },
      );
    });

    it('既存プレイヤーの敗北: losses をインクリメントする', async () => {
      const upsertFn = mockUpsert(null);
      const existing: RatingRow = {
        player_id: 'test-player-uuid', rank: 3, points: 60,
        wins: 5, losses: 2, draws: 1, updated_at: '2026-01-01',
      };

      await upsertRating({ rank: 3, points: 50 }, 'losses', existing);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          wins: 5,
          losses: 3,  // 2 + 1
          draws: 1,
          rank: 3,
          points: 50,
        }),
        { onConflict: 'player_id' },
      );
    });

    it('引き分け: draws をインクリメントする', async () => {
      const upsertFn = mockUpsert(null);
      const existing: RatingRow = {
        player_id: 'test-player-uuid', rank: 5, points: 40,
        wins: 3, losses: 1, draws: 0, updated_at: '2026-01-01',
      };

      await upsertRating({ rank: 5, points: 40 }, 'draws', existing);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ draws: 1 }),
        { onConflict: 'player_id' },
      );
    });
  });

  describe('異常系', () => {
    it('DB エラーが発生した場合、エラーを投げる', async () => {
      mockUpsert({ message: 'upsert error' });

      await expect(upsertRating({ rank: 1, points: 0 }, 'wins', null)).rejects.toThrow('upsert error');
    });
  });

  describe('境界値', () => {
    it('新規プレイヤー（null）の引き分け: wins=0, losses=0, draws=1', async () => {
      const upsertFn = mockUpsert(null);

      await upsertRating({ rank: 1, points: 0 }, 'draws', null);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ wins: 0, losses: 0, draws: 1 }),
        { onConflict: 'player_id' },
      );
    });

    it('rank=10, points=99 の上限値で upsert できる', async () => {
      const upsertFn = mockUpsert(null);

      await upsertRating({ rank: 10, points: 99 }, 'wins', null);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ rank: 10, points: 99 }),
        { onConflict: 'player_id' },
      );
    });
  });
});
