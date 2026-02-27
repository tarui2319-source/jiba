/**
 * rankEngine のユニットテスト。
 * 純粋関数のため、モック不要。
 */

import {
  applyWin, applyLoss, applyDraw, applyOutcome,
  rankLabel, rankIcon,
  DEFAULT_RATING,
  RatingState,
} from '../../engine/rankEngine';

// ──────────────────────────────────────────────────────────────
// applyWin
// ──────────────────────────────────────────────────────────────

describe('applyWin', () => {
  describe('正常系', () => {
    it('通常時に +20P 加算する', () => {
      const delta = applyWin({ rank: 1, points: 0 });
      expect(delta.after.points).toBe(20);
      expect(delta.after.rank).toBe(1);
      expect(delta.pointsDelta).toBe(20);
      expect(delta.direction).toBe('none');
      expect(delta.rankChanged).toBe(false);
    });

    it('80P → 100P で昇段し、新段位は 20P スタート', () => {
      const delta = applyWin({ rank: 2, points: 80 });
      expect(delta.after.rank).toBe(3);
      expect(delta.after.points).toBe(20);
      expect(delta.rankChanged).toBe(true);
      expect(delta.direction).toBe('up');
    });

    it('direction が none のとき rankChanged は false', () => {
      const delta = applyWin({ rank: 3, points: 30 });
      expect(delta.direction).toBe('none');
      expect(delta.rankChanged).toBe(false);
    });
  });

  describe('境界値', () => {
    it('10段で勝利してもランクは上がらず 100P キャップ', () => {
      const delta = applyWin({ rank: 10, points: 85 });
      // 85 + 20 = 105 → clamp to 100
      expect(delta.after.rank).toBe(10);
      expect(delta.after.points).toBe(100);
      expect(delta.rankChanged).toBe(false);
    });

    it('10段 0P + 勝利で 20P（99未満）', () => {
      const delta = applyWin({ rank: 10, points: 0 });
      expect(delta.after.points).toBe(20);
      expect(delta.after.rank).toBe(10);
    });

    it('9段 80P → 100P で 10段 20P に昇段', () => {
      const delta = applyWin({ rank: 9, points: 80 });
      expect(delta.after.rank).toBe(10);
      expect(delta.after.points).toBe(20);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// applyLoss
// ──────────────────────────────────────────────────────────────

describe('applyLoss', () => {
  describe('正常系', () => {
    it('通常時に -10P 減算する', () => {
      const delta = applyLoss({ rank: 3, points: 50 });
      expect(delta.after.points).toBe(40);
      expect(delta.after.rank).toBe(3);
      expect(delta.pointsDelta).toBe(-10);
      expect(delta.direction).toBe('none');
    });

    it('5P → -5P で降格し、前段位は 50P スタート', () => {
      const delta = applyLoss({ rank: 3, points: 5 });
      expect(delta.after.rank).toBe(2);
      expect(delta.after.points).toBe(50);
      expect(delta.rankChanged).toBe(true);
      expect(delta.direction).toBe('down');
    });

    it('0P でも 1段なら降格しない（0P フロア）', () => {
      const delta = applyLoss({ rank: 1, points: 0 });
      expect(delta.after.rank).toBe(1);
      expect(delta.after.points).toBe(0);
      expect(delta.rankChanged).toBe(false);
    });
  });

  describe('境界値', () => {
    it('1段 5P → 0P 未満 → 降格なしで 0P（1段フロア）', () => {
      const delta = applyLoss({ rank: 1, points: 5 });
      // 5 - 10 = -5 → clamp to 0, rank stays 1
      expect(delta.after.rank).toBe(1);
      expect(delta.after.points).toBe(0);
    });

    it('2段 0P → 降格 → 1段 50P', () => {
      const delta = applyLoss({ rank: 2, points: 0 });
      expect(delta.after.rank).toBe(1);
      expect(delta.after.points).toBe(50);
    });

    it('10段 5P → 降格 → 9段 50P', () => {
      const delta = applyLoss({ rank: 10, points: 5 });
      expect(delta.after.rank).toBe(9);
      expect(delta.after.points).toBe(50);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// applyDraw
// ──────────────────────────────────────────────────────────────

describe('applyDraw', () => {
  it('ポイント・段位ともに変化なし', () => {
    const s: RatingState = { rank: 5, points: 60 };
    const delta = applyDraw(s);
    expect(delta.after).toEqual(s);
    expect(delta.pointsDelta).toBe(0);
    expect(delta.direction).toBe('none');
    expect(delta.rankChanged).toBe(false);
  });

  it('before と after が同じ値', () => {
    const s: RatingState = { rank: 1, points: 0 };
    const delta = applyDraw(s);
    expect(delta.before).toEqual(delta.after);
  });
});

// ──────────────────────────────────────────────────────────────
// applyOutcome ディスパッチャ
// ──────────────────────────────────────────────────────────────

describe('applyOutcome', () => {
  it('win → applyWin と同じ結果', () => {
    const s: RatingState = { rank: 2, points: 30 };
    expect(applyOutcome(s, 'win')).toEqual(applyWin(s));
  });

  it('loss → applyLoss と同じ結果', () => {
    const s: RatingState = { rank: 3, points: 15 };
    expect(applyOutcome(s, 'loss')).toEqual(applyLoss(s));
  });

  it('draw → applyDraw と同じ結果', () => {
    const s: RatingState = { rank: 7, points: 55 };
    expect(applyOutcome(s, 'draw')).toEqual(applyDraw(s));
  });
});

// ──────────────────────────────────────────────────────────────
// rankLabel / rankIcon
// ──────────────────────────────────────────────────────────────

describe('rankLabel', () => {
  it('1段〜10段 のラベルを返す', () => {
    expect(rankLabel(1)).toBe('1段');
    expect(rankLabel(5)).toBe('5段');
    expect(rankLabel(10)).toBe('10段');
  });
});

describe('rankIcon', () => {
  it('全段位で空文字を返す（絵文字廃止）', () => {
    expect(rankIcon(1)).toBe('');
    expect(rankIcon(3)).toBe('');
    expect(rankIcon(5)).toBe('');
    expect(rankIcon(7)).toBe('');
    expect(rankIcon(10)).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────
// DEFAULT_RATING
// ──────────────────────────────────────────────────────────────

describe('DEFAULT_RATING', () => {
  it('1段 0P', () => {
    expect(DEFAULT_RATING).toEqual({ rank: 1, points: 0 });
  });
});
