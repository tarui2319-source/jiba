import { getLegalMoves, isLegalMove } from '../../engine/legalMoves';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';
import { ALL_SHAPES } from '../../engine/shapes';

const SIZE = 6;

describe('getLegalMoves', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('空の盤面: Build のみ・全マス×全 ShapeKind', () => {
    const board = createEmptyBoard(SIZE);
    const moves = getLegalMoves(board, 'first', SIZE);
    const totalCells = SIZE * SIZE;
    // 全マス Build × 7 ShapeKinds
    expect(moves.length).toBe(totalCells * ALL_SHAPES.length);
    expect(moves.every((m) => m.type === 'build')).toBe(true);
  });

  test('blue が1マスにアンカーを置いた後: そのマスは Stack のみ・残りは Build', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    const moves = getLegalMoves(board, 'first', SIZE);

    const buildMoves = moves.filter((m) => m.type === 'build');
    const stackMoves = moves.filter((m) => m.type === 'stack');

    // Stack: (0,0) × 7 shapes
    expect(stackMoves.length).toBe(ALL_SHAPES.length);
    expect(stackMoves.every((m) => m.row === 0 && m.col === 0)).toBe(true);

    // Build: 残り35マス × 7 shapes
    expect(buildMoves.length).toBe((SIZE * SIZE - 1) * ALL_SHAPES.length);
  });

  test('red のアンカーがあるマスは blue にとって Build 不可・Stack 不可', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 2, col: 3, shape: 'weak' }, 'second');
    const moves = getLegalMoves(board, 'first', SIZE);

    // (2,3) を含む Build/Stack が存在しない
    const movesAt23 = moves.filter((m) => m.row === 2 && m.col === 3);
    expect(movesAt23.length).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('全マスに red のアンカーが敷き詰められた場合: blue の合法手はゼロ', () => {
    let board = createEmptyBoard(SIZE);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        board = applyAction(board, { type: 'build', row: r, col: c, shape: 'weak' }, 'second');
      }
    }
    const moves = getLegalMoves(board, 'first', SIZE);
    expect(moves.length).toBe(0);
  });

  test('敵の影響下にある空マスには Build できない', () => {
    let board = createEmptyBoard(SIZE);
    // red が (3,3) に mid_cross（上下左右 power=2）を配置
    // → (2,3)(4,3)(3,2)(3,4) が red 支配になる
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'mid_cross' }, 'second');
    const moves = getLegalMoves(board, 'first', SIZE);

    // red 支配マスへの Build が存在しないこと
    const enemyControlled = [[2, 3], [4, 3], [3, 2], [3, 4]];
    for (const [r, c] of enemyControlled) {
      expect(moves.some((m) => m.type === 'build' && m.row === r && m.col === c)).toBe(false);
    }
    // red アンカーのある (3,3) 自体も Build/Stack 不可
    expect(moves.some((m) => m.row === 3 && m.col === 3)).toBe(false);
  });

  test('isLegalMove: 敵支配の空マスへの Build は不正', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'mid_cross' }, 'second');
    // (2,3) は red 支配の空マス
    expect(isLegalMove(board, { type: 'build', row: 2, col: 3, shape: 'weak' }, 'first', SIZE)).toBe(false);
    // 中立マスは依然 Build 可
    expect(isLegalMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first', SIZE)).toBe(true);
  });

  test('自分のマスと相手のマスが混在: 自分のマスのみ Stack できる', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    board = applyAction(board, { type: 'build', row: 0, col: 1, shape: 'weak' }, 'second');
    const moves = getLegalMoves(board, 'first', SIZE);

    const stacks = moves.filter((m) => m.type === 'stack');
    // Stack は (0,0) のみ
    expect(stacks.every((m) => m.row === 0 && m.col === 0)).toBe(true);
    // (0,1) への Stack はない
    expect(stacks.some((m) => m.row === 0 && m.col === 1)).toBe(false);
  });
});

describe('isLegalMove', () => {
  test('空マスへの Build は合法', () => {
    const board = createEmptyBoard(SIZE);
    expect(isLegalMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first', SIZE)).toBe(true);
  });

  test('非空マスへの Build は不正', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    expect(isLegalMove(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first', SIZE)).toBe(false);
  });

  test('盤外座標は不正', () => {
    const board = createEmptyBoard(SIZE);
    expect(isLegalMove(board, { type: 'build', row: -1, col: 0, shape: 'weak' }, 'first', SIZE)).toBe(false);
    expect(isLegalMove(board, { type: 'build', row: SIZE, col: 0, shape: 'weak' }, 'first', SIZE)).toBe(false);
  });

  test('相手アンカーのみのマスへの Stack は不正', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 1, col: 1, shape: 'weak' }, 'second');
    expect(isLegalMove(board, { type: 'stack', row: 1, col: 1, shape: 'mid_cross' }, 'first', SIZE)).toBe(false);
  });
});
