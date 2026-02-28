import { applyAction, createEmptyBoard } from '../../engine/applyAction';

const SIZE = 6;

describe('applyAction', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('Build: 空マスにアンカーが追加される', () => {
    const board = createEmptyBoard(SIZE);
    const next = applyAction(board, { type: 'build', row: 2, col: 3, shape: 'weak' }, 'first');

    expect(next[2][3].anchors).toHaveLength(1);
    expect(next[2][3].anchors[0]).toEqual({ player: 'first', shape: 'weak' });
  });

  test('Stack: 既存アンカーに追加される', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 1, col: 1, shape: 'weak' }, 'first');
    board = applyAction(board, { type: 'stack', row: 1, col: 1, shape: 'mid_cross' }, 'first');

    expect(board[1][1].anchors).toHaveLength(2);
    expect(board[1][1].anchors[0]).toEqual({ player: 'first', shape: 'weak' });
    expect(board[1][1].anchors[1]).toEqual({ player: 'first', shape: 'mid_cross' });
  });

  // ──────────────────────────────────────────────────────────────────
  // イミュータビリティ確認
  // ──────────────────────────────────────────────────────────────────

  test('元の Board は変更されない（純粋関数）', () => {
    const board = createEmptyBoard(SIZE);
    const original = board[0][0].anchors.length;
    applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    expect(board[0][0].anchors.length).toBe(original);
  });

  test('変更していないマスは同じ参照を保つ', () => {
    const board = createEmptyBoard(SIZE);
    const next = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    // 変更していない (0,1) は同じ Cell オブジェクト
    expect(next[0][1]).toBe(board[0][1]);
    // 変更した行以外は同じ配列参照
    expect(next[1]).toBe(board[1]);
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('同じ ShapeKind を複数 Stack できる', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'first');
    board = applyAction(board, { type: 'stack', row: 3, col: 3, shape: 'weak' }, 'first');
    board = applyAction(board, { type: 'stack', row: 3, col: 3, shape: 'weak' }, 'first');

    expect(board[3][3].anchors).toHaveLength(3);
    expect(board[3][3].anchors.every((a) => a.shape === 'weak')).toBe(true);
  });
});

describe('createEmptyBoard', () => {
  test('6×6 の全マスが空配列', () => {
    const board = createEmptyBoard(6);
    expect(board).toHaveLength(6);
    board.forEach((row) => {
      expect(row).toHaveLength(6);
      row.forEach((cell) => expect(cell.anchors).toHaveLength(0));
    });
  });

  test('9×9 の全マスが空配列', () => {
    const board = createEmptyBoard(9);
    expect(board).toHaveLength(9);
    expect(board[8][8].anchors).toHaveLength(0);
  });
});
