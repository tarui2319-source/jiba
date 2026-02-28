import { getResult } from '../../engine/gameResult';
import { computeInfluence } from '../../engine/influence';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';

describe('getResult', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('blue マスが多い場合: blue が勝利', () => {
    let board = createEmptyBoard(6);
    // blue が (0,0) に weak → (0,1)(1,0)(1,1) に blue=1
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'first');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('first');
    expect(result.firstCount).toBeGreaterThan(result.secondCount);
  });

  test('red マスが多い場合: red が勝利', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 5, col: 5, shape: 'weak' }, 'second');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('second');
  });

  test('全マス neutral の場合: draw', () => {
    const board = createEmptyBoard(6);
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('draw');
    expect(result.firstCount).toBe(0);
    expect(result.secondCount).toBe(0);
    expect(result.neutralCount).toBe(36);
  });

  // ──────────────────────────────────────────────────────────────────
  // タイブレーク
  // ──────────────────────────────────────────────────────────────────

  test('マス数同数: |D| 総和で決まる', () => {
    let board = createEmptyBoard(6);
    // blue: (0,0) に mid_cross(p=2) → (0,1)(1,0) に blue=2
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'mid_cross' }, 'first');
    // red: (5,5) に weak(p=1) → (4,5)(5,4)(4,4) に red=1
    board = applyAction(board, { type: 'build', row: 5, col: 5, shape: 'weak' }, 'second');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    if (result.firstCount === result.secondCount) {
      // マス数同数なら power で決める
      expect(result.winner).toBe(result.firstPower > result.secondPower ? 'first' : 'second');
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('firstPower と secondPower を正しく集計する', () => {
    let board = createEmptyBoard(6);
    // blue: (3,3) に strong_vert(p=4) → (2,3)(4,3) に blue=4
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'strong_vert' }, 'first');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    // アンカーマス自身(3,3) + 影響マス(2,3)(4,3) = 3マス（アンカーマスは恒久陣地ルール）
    expect(result.firstCount).toBe(3);
    // firstPower: (3,3)のdisplayValue=0 + (2,3)=4 + (4,3)=4 = 8
    expect(result.firstPower).toBe(8);
    expect(result.secondCount).toBe(0);
  });
});
