import { getRandomMove } from '../../engine/randomMove';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';
import { isLegalMove } from '../../engine/legalMoves';

const SIZE = 6;

describe('getRandomMove', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('空の盤面: 返される手は必ず合法手である', () => {
    const board = createEmptyBoard(SIZE);
    const move = getRandomMove(board, 'blue', SIZE);
    expect(move).not.toBeNull();
    expect(isLegalMove(board, move!, 'blue', SIZE)).toBe(true);
  });

  test('seed=0 で常に同じ手が返る（決定論的テスト）', () => {
    const board = createEmptyBoard(SIZE);
    const rand = () => 0; // 常にインデックス0 → 最初の合法手
    const move1 = getRandomMove(board, 'blue', SIZE, rand);
    const move2 = getRandomMove(board, 'blue', SIZE, rand);
    expect(move1).toEqual(move2);
  });

  test('seed=0.999... で最後の合法手が返る', () => {
    const board = createEmptyBoard(SIZE);
    const rand = () => 0.9999;
    const move = getRandomMove(board, 'blue', SIZE, rand);
    expect(move).not.toBeNull();
    expect(isLegalMove(board, move!, 'blue', SIZE)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────
  // 異常系・境界値
  // ──────────────────────────────────────────────────────────────────

  test('合法手がゼロ（全マス相手のアンカー）: null を返す', () => {
    let board = createEmptyBoard(SIZE);
    // 全マスに red のアンカーを配置
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        board = applyAction(board, { type: 'build', row: r, col: c, shape: 'weak' }, 'red');
      }
    }
    const move = getRandomMove(board, 'blue', SIZE);
    expect(move).toBeNull();
  });

  test('返される手の type は build か stack のどちらか', () => {
    const board = createEmptyBoard(SIZE);
    const move = getRandomMove(board, 'blue', SIZE);
    expect(['build', 'stack']).toContain(move?.type);
  });

  test('stack 可能なマスがある場合も合法手を返す', () => {
    let board = createEmptyBoard(SIZE);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    const move = getRandomMove(board, 'blue', SIZE);
    expect(move).not.toBeNull();
    expect(isLegalMove(board, move!, 'blue', SIZE)).toBe(true);
  });
});
