import {
  createTurnState,
  applyTurn,
  isGameOver,
  totalMoves,
} from '../../engine/turnManager';
import { createEmptyBoard } from '../../engine/applyAction';

const SIZE = 6;

describe('createTurnState', () => {
  test('quick モード: movesLeft=12, currentPlayer=blue, phase=playing', () => {
    const state = createTurnState('quick');
    expect(state.currentPlayer).toBe('first');
    expect(state.movesLeft.first).toBe(12);
    expect(state.movesLeft.second).toBe(12);
    expect(state.phase).toBe('playing');
    expect(state.moveHistory).toHaveLength(0);
  });

  test('standard モード: movesLeft=18', () => {
    const state = createTurnState('standard');
    expect(state.movesLeft.first).toBe(18);
    expect(state.movesLeft.second).toBe(18);
  });
});

describe('applyTurn', () => {
  // ──────────────────────────────────────────────────────────────────
  // 正常系
  // ──────────────────────────────────────────────────────────────────

  test('blue が合法手を打つ: currentPlayer が red に交代し movesLeft.first が1減る', () => {
    const state = createTurnState('quick');
    const board = createEmptyBoard(SIZE);
    const { nextState, nextBoard } = applyTurn(
      state,
      { type: 'build', row: 0, col: 0, shape: 'weak' },
      board,
      SIZE,
    );

    expect(nextState.currentPlayer).toBe('second');
    expect(nextState.movesLeft.first).toBe(11);
    expect(nextState.movesLeft.second).toBe(12);
    expect(nextState.phase).toBe('playing');
    expect(nextState.moveHistory).toHaveLength(1);
    expect(nextBoard[0][0].anchors).toHaveLength(1);
  });

  test('交互に1手ずつ: ターン交代が正しく繰り返される', () => {
    let state = createTurnState('quick');
    let board = createEmptyBoard(SIZE);

    ({ nextState: state, nextBoard: board } = applyTurn(
      state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE,
    ));
    expect(state.currentPlayer).toBe('second');

    ({ nextState: state, nextBoard: board } = applyTurn(
      state, { type: 'build', row: 5, col: 5, shape: 'weak' }, board, SIZE,
    ));
    expect(state.currentPlayer).toBe('first');
    expect(state.movesLeft).toEqual({ first: 11, second: 11 });
  });

  test('moveHistory に全アクションが記録される', () => {
    let state = createTurnState('quick');
    let board = createEmptyBoard(SIZE);

    ({ nextState: state, nextBoard: board } = applyTurn(
      state, { type: 'build', row: 1, col: 1, shape: 'mid_cross' }, board, SIZE,
    ));
    ({ nextState: state, nextBoard: board } = applyTurn(
      state, { type: 'build', row: 4, col: 4, shape: 'mid_diag' }, board, SIZE,
    ));

    expect(state.moveHistory).toHaveLength(2);
    expect(state.moveHistory[0]).toEqual({ player: 'first', action: { type: 'build', row: 1, col: 1, shape: 'mid_cross' } });
    expect(state.moveHistory[1]).toEqual({ player: 'second',  action: { type: 'build', row: 4, col: 4, shape: 'mid_diag' } });
  });

  // ──────────────────────────────────────────────────────────────────
  // 異常系
  // ──────────────────────────────────────────────────────────────────

  test('不正手（非空マスへの Build）は例外を投げる', () => {
    let state = createTurnState('quick');
    let board = createEmptyBoard(SIZE);
    ({ nextState: state, nextBoard: board } = applyTurn(
      state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE,
    ));
    // red が既に blue のアンカーがあるマスに Build しようとする → 不正
    expect(() =>
      applyTurn(state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE),
    ).toThrow('Illegal move');
  });

  test('ゲーム終了後の applyTurn は例外を投げる', () => {
    // 最小構成: movesLeft を手動で0に
    const finishedState = {
      ...createTurnState('quick'),
      phase: 'finished' as const,
    };
    expect(() =>
      applyTurn(finishedState, { type: 'build', row: 0, col: 0, shape: 'weak' }, createEmptyBoard(SIZE), SIZE),
    ).toThrow('already finished');
  });

  // ──────────────────────────────────────────────────────────────────
  // 境界値
  // ──────────────────────────────────────────────────────────────────

  test('最終手を打つと phase=finished になる', () => {
    // quick モードは1人12手。テスト簡略のため movesLeft を1にセット
    const state = {
      ...createTurnState('quick'),
      movesLeft: { first: 1, second: 0 }  // second はすでに0,  
    };
    const board = createEmptyBoard(SIZE);
    const { nextState } = applyTurn(
      state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE,
    );
    expect(nextState.phase).toBe('finished');
    expect(nextState.movesLeft.first).toBe(0);
  });

  test('元の state は不変（純粋関数）', () => {
    const state = createTurnState('quick');
    const board = createEmptyBoard(SIZE);
    applyTurn(state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE);
    expect(state.currentPlayer).toBe('first');
    expect(state.movesLeft.first).toBe(12);
  });
});

describe('isGameOver', () => {
  test('playing 中は false', () => {
    expect(isGameOver(createTurnState('quick'))).toBe(false);
  });

  test('finished なら true', () => {
    const state = { ...createTurnState('quick'), phase: 'finished' as const };
    expect(isGameOver(state)).toBe(true);
  });
});

describe('totalMoves', () => {
  test('初期状態は 0', () => {
    expect(totalMoves(createTurnState('quick'), 'quick')).toBe(0);
  });

  test('blue1手後は 1', () => {
    let state = createTurnState('quick');
    let board = createEmptyBoard(SIZE);
    ({ nextState: state } = applyTurn(
      state, { type: 'build', row: 0, col: 0, shape: 'weak' }, board, SIZE,
    ));
    expect(totalMoves(state, 'quick')).toBe(1);
  });
});
