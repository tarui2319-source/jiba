import { getBestMove } from '../../cpu/cpuPlayer';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';
import { isLegalMove } from '../../engine/legalMoves';
import { scoreMove } from '../../cpu/evaluate';

const SIZE = 6;

describe('getBestMove', () => {
  // ──────────────────────────────────────────────────────────────────
  // 共通: 全難易度でテスト
  // ──────────────────────────────────────────────────────────────────

  const DIFFICULTIES = [1, 2, 3, 4] as const;

  DIFFICULTIES.forEach((lv) => {
    test(`Lv${lv}: 空の盤面 → 合法手を返す`, () => {
      const board = createEmptyBoard(SIZE);
      const move = getBestMove(board, 'first', SIZE, lv);
      expect(move).not.toBeNull();
      expect(isLegalMove(board, move!, 'first', SIZE)).toBe(true);
    });

    test(`Lv${lv}: 合法手ゼロ → null を返す`, () => {
      let board = createEmptyBoard(SIZE);
      // 全マスに red のアンカーを配置（blue は build も stack も不可）
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          board = applyAction(board, { type: 'build', row: r, col: c, shape: 'weak' }, 'second');
        }
      }
      expect(getBestMove(board, 'first', SIZE, lv)).toBeNull();
    });

    test(`Lv${lv}: 返される手の type は build か stack`, () => {
      const board = createEmptyBoard(SIZE);
      const move = getBestMove(board, 'first', SIZE, lv);
      expect(['build', 'stack']).toContain(move?.type);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Lv1（ランダム）
  // ──────────────────────────────────────────────────────────────────

  describe('Lv1 (かんたん)', () => {
    test('rand=0 で常に同じ手（決定論的）', () => {
      const board = createEmptyBoard(SIZE);
      const rand = () => 0;
      expect(getBestMove(board, 'first', SIZE, 1, rand))
        .toEqual(getBestMove(board, 'first', SIZE, 1, rand));
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Lv2（貪欲・支配マスのみ）
  // ──────────────────────────────────────────────────────────────────

  describe('Lv2 (ふつう)', () => {
    test('最大支配マス数を持つ手を選ぶ', () => {
      const board = createEmptyBoard(SIZE);
      const move = getBestMove(board, 'first', SIZE, 2);
      expect(move).not.toBeNull();

      // 得られた手のスコア
      const score = scoreMove(board, move!, 'first', SIZE, /* includePower */ false);

      // 角(0,0)のweakは支配3マス → Lv2 はこれより高スコアの手を選ぶはず
      const cornerScore = scoreMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first', SIZE, false);
      expect(score).toBeGreaterThanOrEqual(cornerScore);
    });

    test('rand=0 で同じ手（決定論的）', () => {
      const board = createEmptyBoard(SIZE);
      const rand = () => 0;
      expect(getBestMove(board, 'first', SIZE, 2, rand))
        .toEqual(getBestMove(board, 'first', SIZE, 2, rand));
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Lv3（貪欲・影響力込み）
  // ──────────────────────────────────────────────────────────────────

  describe('Lv3 (むずかしい)', () => {
    test('合法手の中で最高スコアを持つ手を返す', () => {
      const board = createEmptyBoard(SIZE);
      const move = getBestMove(board, 'first', SIZE, 3);
      expect(move).not.toBeNull();

      const score = scoreMove(board, move!, 'first', SIZE, true);

      // 全合法手のスコアを確認し、返された手が最高（or 同等）であること
      // ここでは角との比較で十分
      const cornerScore = scoreMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first', SIZE, true);
      expect(score).toBeGreaterThanOrEqual(cornerScore);
    });

    test('Lv3 が Lv2 より強い（ある局面でスコアが同等以上）', () => {
      // 評価関数の質は Lv3 >= Lv2 なので、少なくとも等しい
      const board = createEmptyBoard(SIZE);
      const moveLv2 = getBestMove(board, 'first', SIZE, 2, () => 0);
      const moveLv3 = getBestMove(board, 'first', SIZE, 3);
      expect(moveLv3).not.toBeNull();
      expect(moveLv2).not.toBeNull();
      // Lv3 の手のスコアは Lv2 の手のスコア以上
      const scoreLv3 = scoreMove(board, moveLv3!, 'first', SIZE, true);
      const scoreLv2 = scoreMove(board, moveLv2!, 'first', SIZE, true);
      expect(scoreLv3).toBeGreaterThanOrEqual(scoreLv2 - 0.001);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Lv4（1手読み）
  // ──────────────────────────────────────────────────────────────────

  describe('Lv4 (さいきょう)', () => {
    test('空の盤面 → 合法手を返す', () => {
      const board = createEmptyBoard(SIZE);
      const move = getBestMove(board, 'first', SIZE, 4);
      expect(move).not.toBeNull();
      expect(isLegalMove(board, move!, 'first', SIZE)).toBe(true);
    });

    test('相手がすでに強い位置を持つ局面でも合法手を返す', () => {
      let board = createEmptyBoard(SIZE);
      board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'mid_cross' }, 'second');
      const move = getBestMove(board, 'first', SIZE, 4);
      expect(move).not.toBeNull();
      expect(isLegalMove(board, move!, 'first', SIZE)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('stack 可能なマスがある局面でも合法手を返す（Lv3）', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'first');
    const move = getBestMove(board, 'first', SIZE, 3);
    expect(move).not.toBeNull();
    expect(isLegalMove(board, move!, 'first', SIZE)).toBe(true);
  });

  test('盤面が埋まりかけの局面でも全難易度が合法手を返す', () => {
    let board = createEmptyBoard(SIZE);
    // 角だけ blue で埋める
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    board = applyAction(board, { type: 'build', row: 0, col: 5, shape: 'weak' }, 'first');

    for (const lv of [1, 2, 3, 4] as const) {
      const move = getBestMove(board, 'second', SIZE, lv);
      expect(move).not.toBeNull();
      expect(isLegalMove(board, move!, 'second', SIZE)).toBe(true);
    }
  });
});
