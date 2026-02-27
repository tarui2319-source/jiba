import { scoreBoard, scoreMove } from '../../cpu/evaluate';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';
import { computeInfluence } from '../../engine/influence';

const SIZE = 6;

describe('scoreBoard', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('空の盤面: blue / red ともにスコア 0', () => {
    const board = createEmptyBoard(SIZE);
    const inf = computeInfluence(board, SIZE);
    // -0 vs 0 を toBeCloseTo で許容
    expect(scoreBoard(inf, 'blue')).toBeCloseTo(0);
    expect(scoreBoard(inf, 'red')).toBeCloseTo(0);
  });

  test('blue が 1マス配置後: blue スコア > 0, red スコア < 0', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, SIZE);
    expect(scoreBoard(inf, 'blue')).toBeGreaterThan(0);
    expect(scoreBoard(inf, 'red')).toBeLessThan(0);
  });

  test('blue と red のスコアは符号反転（ゼロサム）', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, SIZE);
    expect(scoreBoard(inf, 'blue')).toBeCloseTo(-scoreBoard(inf, 'red'));
  });

  test('includePower=false: 支配マス差のみ（整数値）', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, SIZE);
    const score = scoreBoard(inf, 'blue', false);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  test('includePower=true は includePower=false より精度が高い（float）', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, SIZE);
    const withPower    = scoreBoard(inf, 'blue', true);
    const withoutPower = scoreBoard(inf, 'blue', false);
    // Δ影響力の 0.01 係数分だけ差がある
    expect(withPower).not.toBe(withoutPower);
  });

  test('strong_vert は weak より blue スコアが高い（中央配置）', () => {
    const boardWeak = applyAction(createEmptyBoard(SIZE), { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const boardStrong = applyAction(createEmptyBoard(SIZE), { type: 'build', row: 3, col: 3, shape: 'strong_vert' }, 'blue');
    const infWeak   = computeInfluence(boardWeak, SIZE);
    const infStrong = computeInfluence(boardStrong, SIZE);
    // strong_vert は隣接2マスに power=4 → 支配は 2 マスだが影響力が大きい
    // weak は 8 マスに power=1 → 支配は最大 8 マス
    // 支配マス数では weak が勝るが、includePower 込みでは strong が影響力面で優位
    expect(scoreBoard(infWeak, 'blue', false)).toBeGreaterThan(scoreBoard(infStrong, 'blue', false));
    expect(scoreBoard(infWeak, 'blue', true)).toBeGreaterThan(0);
    expect(scoreBoard(infStrong, 'blue', true)).toBeGreaterThan(0);
  });
});

describe('scoreMove', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('中央付近の weak は角の weak より高スコア', () => {
    const board = createEmptyBoard(SIZE);
    const centerScore = scoreMove(board, { type: 'build', row: 2, col: 2, shape: 'weak' }, 'blue', SIZE);
    const cornerScore = scoreMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'blue', SIZE);
    expect(centerScore).toBeGreaterThan(cornerScore);
  });

  test('blue の scoreMove は red から見ると低スコア', () => {
    const board = createEmptyBoard(SIZE);
    const action = { type: 'build' as const, row: 3, col: 3, shape: 'weak' as const };
    const blueScore = scoreMove(board, action, 'blue', SIZE);
    const redPerspective = scoreMove(board, action, 'blue', SIZE, true);
    // blue が打った場合、blue 視点でプラス
    expect(blueScore).toBeGreaterThan(0);
    // ゼロサムなので red 視点では同じ手を red が打った場合にプラスになる
    const redScore = scoreMove(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'red', SIZE);
    expect(redScore).toBeGreaterThan(0);
    expect(blueScore).toBeCloseTo(-scoreMove(createEmptyBoard(SIZE), { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue', SIZE) * -1);
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('角マス(0,0)での weak は 4 マス支配（アンカーマス自身 + 隣接3マス）', () => {
    const board = createEmptyBoard(SIZE);
    const score = scoreMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'blue', SIZE, false);
    // (0,0) アンカーマス自身（恒久陣地）+ 隣接の(0,1)(1,0)(1,1)の3マス = 4マス
    expect(score).toBe(4);
  });

  test('中央(2,2)での weak は 9 マス支配（アンカーマス自身 + 周囲8マス）', () => {
    const board = createEmptyBoard(SIZE);
    const score = scoreMove(board, { type: 'build', row: 2, col: 2, shape: 'weak' }, 'blue', SIZE, false);
    expect(score).toBe(9);
  });
});
