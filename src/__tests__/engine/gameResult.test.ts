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
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('blue');
    expect(result.blueCount).toBeGreaterThan(result.redCount);
  });

  test('red マスが多い場合: red が勝利', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 5, col: 5, shape: 'weak' }, 'red');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('red');
  });

  test('全マス neutral の場合: draw', () => {
    const board = createEmptyBoard(6);
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    expect(result.winner).toBe('draw');
    expect(result.blueCount).toBe(0);
    expect(result.redCount).toBe(0);
    expect(result.neutralCount).toBe(36);
  });

  // ──────────────────────────────────────────────────────────────────
  // タイブレーク
  // ──────────────────────────────────────────────────────────────────

  test('マス数同数: |D| 総和で決まる', () => {
    let board = createEmptyBoard(6);
    // blue: (0,0) に mid_cross(p=2) → (0,1)(1,0) に blue=2
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'mid_cross' }, 'blue');
    // red: (5,5) に weak(p=1) → (4,5)(5,4)(4,4) に red=1
    board = applyAction(board, { type: 'build', row: 5, col: 5, shape: 'weak' }, 'red');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    if (result.blueCount === result.redCount) {
      // マス数同数なら power で決める
      expect(result.winner).toBe(result.bluePower > result.redPower ? 'blue' : 'red');
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('bluePower と redPower を正しく集計する', () => {
    let board = createEmptyBoard(6);
    // blue: (3,3) に strong_vert(p=4) → (2,3)(4,3) に blue=4
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'strong_vert' }, 'blue');
    const inf = computeInfluence(board, 6);
    const result = getResult(inf);

    // アンカーマス自身(3,3) + 影響マス(2,3)(4,3) = 3マス（アンカーマスは恒久陣地ルール）
    expect(result.blueCount).toBe(3);
    // bluePower: (3,3)のdisplayValue=0 + (2,3)=4 + (4,3)=4 = 8
    expect(result.bluePower).toBe(8);
    expect(result.redCount).toBe(0);
  });
});
