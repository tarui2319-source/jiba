import { computeInfluence } from '../../engine/influence';
import { createEmptyBoard, applyAction } from '../../engine/applyAction';

describe('computeInfluence', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('空の盤面: 全マス blue=0, red=0, neutral', () => {
    const board = createEmptyBoard(6);
    const inf = computeInfluence(board, 6);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        expect(inf[r][c].blue).toBe(0);
        expect(inf[r][c].red).toBe(0);
        expect(inf[r][c].d).toBe(0);
        expect(inf[r][c].controller).toBe('neutral');
        expect(inf[r][c].displayValue).toBe(0);
      }
    }
  });

  test('中央に weak(blue) を置いた場合: 周囲8マスが blue=1', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 2, col: 2, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, 6);

    // (2,2) の weak offsets: [-1,-1][-1,0][-1,1][0,-1][0,1][1,-1][1,0][1,1]
    const expectedBlue = [
      [1, 1], [1, 2], [1, 3],
      [2, 1],         [2, 3],
      [3, 1], [3, 2], [3, 3],
    ];
    for (const [r, c] of expectedBlue) {
      expect(inf[r][c].blue).toBe(1);
      expect(inf[r][c].controller).toBe('blue');
    }
    // アンカー自身のマスは影響対象外（blue/red/d の生値は変わらない）
    expect(inf[2][2].blue).toBe(0);
    // ルール: アンカーを置いたマスは置いたプレイヤーの恒久陣地
    expect(inf[2][2].controller).toBe('blue');
  });

  test('strong_vert(blue) at (3,3): 上下2マスが blue=4', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'strong_vert' }, 'blue');
    const inf = computeInfluence(board, 6);

    expect(inf[2][3].blue).toBe(4);
    expect(inf[4][3].blue).toBe(4);
    expect(inf[3][2].blue).toBe(0); // 横は影響なし
    expect(inf[3][4].blue).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────
  // 異常系・境界値
  // ──────────────────────────────────────────────────────────────────

  test('コーナー(0,0)の weak(blue): 盤外参照なし・影響は3マスのみ', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 0, col: 0, shape: 'weak' }, 'blue');
    const inf = computeInfluence(board, 6);

    // コーナーから影響を受けられる有効なマス
    expect(inf[0][1].blue).toBe(1);
    expect(inf[1][0].blue).toBe(1);
    expect(inf[1][1].blue).toBe(1);
    // 盤外を参照していないこと（エラーが出ないこと）
    expect(inf[0][0].blue).toBe(0);
  });

  test('重設（Stack）: 同マスに weak(blue) + mid_cross(blue) の影響力が加算される', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 3, col: 3, shape: 'weak' }, 'blue');
    board = applyAction(board, { type: 'stack', row: 3, col: 3, shape: 'mid_cross' }, 'blue');
    const inf = computeInfluence(board, 6);

    // (2,3): weak の上方向(p=1) + mid_cross の上方向(p=2) = 3
    expect(inf[2][3].blue).toBe(3);
    // (3,2): weak の左(p=1) + mid_cross の左(p=2) = 3
    expect(inf[3][2].blue).toBe(3);
    // (2,2): weak の左上(p=1)のみ
    expect(inf[2][2].blue).toBe(1);
  });

  test('blue と red が競合するマス: D値が差分になる', () => {
    let board = createEmptyBoard(6);
    // blue が (2,2) に mid_cross(p=2)
    board = applyAction(board, { type: 'build', row: 2, col: 2, shape: 'mid_cross' }, 'blue');
    // red が (2,4) に mid_cross(p=2) → (2,3) が blue=2, red=2 → neutral
    board = applyAction(board, { type: 'build', row: 2, col: 4, shape: 'mid_cross' }, 'red');
    const inf = computeInfluence(board, 6);

    expect(inf[2][3].blue).toBe(2);
    expect(inf[2][3].red).toBe(2);
    expect(inf[2][3].d).toBe(0);
    expect(inf[2][3].controller).toBe('neutral');
  });

  test('9×9 盤面でも正しく計算できる（サイズ非依存）', () => {
    const board = createEmptyBoard(9);
    const inf = computeInfluence(board, 9);
    expect(inf.length).toBe(9);
    expect(inf[0].length).toBe(9);
    expect(inf[8][8].blue).toBe(0);
  });

  test('strong_diag_nwse(blue) at (2,2): ↖(1,1) と ↘(3,3) が blue=4', () => {
    let board = createEmptyBoard(6);
    board = applyAction(board, { type: 'build', row: 2, col: 2, shape: 'strong_diag_nwse' }, 'blue');
    const inf = computeInfluence(board, 6);

    expect(inf[1][1].blue).toBe(4); // ↖
    expect(inf[3][3].blue).toBe(4); // ↘
    expect(inf[1][3].blue).toBe(0); // ↗は影響なし
    expect(inf[3][1].blue).toBe(0); // ↙は影響なし
  });
});
