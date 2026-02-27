/**
 * JIBA Engine — 型定義
 * UI 非依存・純粋関数専用
 */

export type Player = 'blue' | 'red';

/**
 * ShapeKind: アンカーの形状。7種類。
 * 影響距離はすべて1マスのみ。
 */
export type ShapeKind =
  | 'weak'             // 弱: 周囲8マス, power=1
  | 'mid_cross'        // 中(縦横): 上下左右4マス, power=2
  | 'mid_diag'         // 中(斜め): 斜め4マス, power=2
  | 'strong_vert'      // 強(縦): 上下2マス, power=4
  | 'strong_horiz'     // 強(横): 左右2マス, power=4
  | 'strong_diag_nwse' // 強(斜め↖↘): ↖↘2マス, power=4
  | 'strong_diag_nesw' // 強(斜め↗↙): ↗↙2マス, power=4

/** 1マスに配置された1つのアンカー */
export interface Anchor {
  player: Player;
  shape: ShapeKind;
}

/** 盤面の1マス */
export interface Cell {
  /** 重設含む全アンカー。空マス = [] */
  anchors: Anchor[];
}

/** Board[row][col] (row: 0=上, col: 0=左) */
export type Board = Cell[][];

/** computeInfluence の計算結果（1マス分） */
export interface CellState {
  blue: number;
  red: number;
  /** blue - red */
  d: number;
  /** D値の符号で決まる支配者 */
  controller: Player | 'neutral';
  /** 表示値: |d| */
  displayValue: number;
}

/** 1ターンのアクション */
export type Action =
  | { type: 'build'; row: number; col: number; shape: ShapeKind }
  | { type: 'stack'; row: number; col: number; shape: ShapeKind };

/** ゲームモード */
export type GameMode = 'quick' | 'standard';

export const BOARD_SIZE: Record<GameMode, number> = {
  quick: 6,
  standard: 9,
};

export const MAX_MOVES: Record<GameMode, number> = {
  quick: 12,
  standard: 18,
};

/** 対局結果 */
export interface GameResult {
  winner: Player | 'draw';
  blueCount: number;
  redCount: number;
  neutralCount: number;
  /** タイブレーク: |D(c)| 総和 */
  bluePower: number;
  redPower: number;
}
