/**
 * JIBA — ゲームステート管理フック
 * engine の純粋関数と React の状態を接続する。
 * Supabase 接続は MVP5（オンライン対戦）フェーズで追加。
 */

import { useReducer, useCallback, useMemo } from 'react';
import {
  Board,
  Action,
  Player,
  GameMode,
  TurnState,
  CellState,
  GameResult,
  createEmptyBoard,
  createTurnState,
  applyTurn,
  isGameOver,
  computeInfluence,
  getResult,
  getRandomMove,
  isLegalMove,
} from '../engine';
import { BOARD_SIZE } from '../constants/gameConfig';

// ────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────

interface GameState {
  mode: GameMode;
  board: Board;
  turnState: TurnState;
  influence: CellState[][];
  result: GameResult | null;
  surrenderedBy?: Player;
}

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────

type GameAction =
  | { type: 'APPLY_MOVE'; action: Action }
  | { type: 'RESET'; mode: GameMode }
  | { type: 'SURRENDER'; player: Player };

// ────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────

function makeInitialState(mode: GameMode): GameState {
  const size = BOARD_SIZE[mode];
  const board = createEmptyBoard(size);
  return {
    mode,
    board,
    turnState: createTurnState(mode),
    influence: computeInfluence(board, size),
    result: null,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return makeInitialState(action.mode);

    case 'APPLY_MOVE': {
      if (state.result !== null) return state; // ゲーム終了後は無視

      const size = BOARD_SIZE[state.mode];
      const { currentPlayer, phase } = state.turnState;

      if (phase === 'finished') return state;

      if (!isLegalMove(state.board, action.action, currentPlayer, size)) {
        return state; // 不正手は無視（サーバー権威でも再確認）
      }

      try {
        const { nextState, nextBoard } = applyTurn(
          state.turnState,
          action.action,
          state.board,
          size,
        );

        const nextInfluence = computeInfluence(nextBoard, size);
        const nextResult = isGameOver(nextState)
          ? getResult(nextInfluence)
          : null;

        return {
          ...state,
          board: nextBoard,
          turnState: nextState,
          influence: nextInfluence,
          result: nextResult,
        };
      } catch {
        return state;
      }
    }

    case 'SURRENDER': {
      if (state.result !== null) return state;
      if (state.turnState.phase === 'finished') return state;

      const surrenderer = action.player;
      const winner: Player = surrenderer === 'blue' ? 'red' : 'blue';
      const baseResult = getResult(state.influence);
      const surrenderResult: GameResult = { ...baseResult, winner };
      const finishedTurnState: TurnState = { ...state.turnState, phase: 'finished' };

      return {
        ...state,
        turnState: finishedTurnState,
        result: surrenderResult,
        surrenderedBy: surrenderer,
      };
    }

    default:
      return state;
  }
}

// ────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────

export interface UseGameStateReturn {
  gameState: GameState;
  applyMove: (action: Action) => void;
  applyRandomMove: () => void;
  resetGame: (mode?: GameMode) => void;
  surrender: (player: Player) => void;
  size: number;
}

export function useGameState(initialMode: GameMode = 'quick'): UseGameStateReturn {
  const [gameState, dispatch] = useReducer(gameReducer, initialMode, makeInitialState);

  const size = BOARD_SIZE[gameState.mode];

  const applyMove = useCallback((action: Action) => {
    dispatch({ type: 'APPLY_MOVE', action });
  }, []);

  const applyRandomMove = useCallback(() => {
    const move = getRandomMove(
      gameState.board,
      gameState.turnState.currentPlayer,
      size,
    );
    if (move) dispatch({ type: 'APPLY_MOVE', action: move });
  }, [gameState.board, gameState.turnState.currentPlayer, size]);

  const resetGame = useCallback((mode: GameMode = initialMode) => {
    dispatch({ type: 'RESET', mode });
  }, [initialMode]);

  const surrender = useCallback((player: Player) => {
    dispatch({ type: 'SURRENDER', player });
  }, []);

  return useMemo(
    () => ({ gameState, applyMove, applyRandomMove, resetGame, surrender, size }),
    [gameState, applyMove, applyRandomMove, resetGame, surrender, size],
  );
}
