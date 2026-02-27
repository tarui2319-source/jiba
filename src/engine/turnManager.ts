/**
 * JIBA Engine — ターン管理
 * 純粋関数ステートマシン。タイマー・振動は UI 層の責務。
 */

import { Player, Action, Board, GameMode, MAX_MOVES } from './types';
import { isLegalMove } from './legalMoves';
import { applyAction } from './applyAction';

export type GamePhase = 'playing' | 'finished';

export interface TurnState {
  currentPlayer: Player;
  movesLeft: Record<Player, number>;
  phase: GamePhase;
  moveHistory: ReadonlyArray<{ player: Player; action: Action }>;
}

/**
 * 初期 TurnState を生成する。先手は blue 固定。
 */
export function createTurnState(mode: GameMode): TurnState {
  const total = MAX_MOVES[mode];
  return {
    currentPlayer: 'blue',
    movesLeft: { blue: total, red: total },
    phase: 'playing',
    moveHistory: [],
  };
}

/**
 * アクションを適用してターンを進め、新しい [TurnState, Board] を返す。
 * 純粋関数。元の state・board は変更しない。
 *
 * @throws {Error} 不正手（isLegalMove が false）の場合
 * @throws {Error} ゲーム終了後の呼び出し
 */
export function applyTurn(
  state: TurnState,
  action: Action,
  board: Board,
  size: number,
): { nextState: TurnState; nextBoard: Board } {
  if (state.phase === 'finished') {
    throw new Error('Game is already finished');
  }

  const { currentPlayer } = state;

  if (!isLegalMove(board, action, currentPlayer, size)) {
    throw new Error(
      `Illegal move: ${JSON.stringify(action)} for player ${currentPlayer}`,
    );
  }

  const nextBoard = applyAction(board, action, currentPlayer);

  const nextMovesLeft: Record<Player, number> = {
    blue: state.movesLeft.blue - (currentPlayer === 'blue' ? 1 : 0),
    red:  state.movesLeft.red  - (currentPlayer === 'red'  ? 1 : 0),
  };

  const isFinished = nextMovesLeft.blue === 0 && nextMovesLeft.red === 0;

  const nextState: TurnState = {
    currentPlayer: currentPlayer === 'blue' ? 'red' : 'blue',
    movesLeft: nextMovesLeft,
    phase: isFinished ? 'finished' : 'playing',
    moveHistory: [
      ...state.moveHistory,
      { player: currentPlayer, action },
    ],
  };

  return { nextState, nextBoard };
}

/**
 * ゲームが終了しているかどうかを返す。
 */
export function isGameOver(state: TurnState): boolean {
  return state.phase === 'finished';
}

/**
 * 経過手数を返す（blue + red の合計）。
 */
export function totalMoves(state: TurnState, mode: GameMode): number {
  const total = MAX_MOVES[mode];
  return (total - state.movesLeft.blue) + (total - state.movesLeft.red);
}
