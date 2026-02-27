/**
 * JIBA Engine — アクション適用
 * 純粋関数。immutable に新しい Board を返す。
 */

import { Board, Player, Action, Cell } from './types';

/**
 * アクションを盤面に適用して新しい Board を返す。
 * 元の board は変更しない（shallow copy で各 Cell を置き換える）。
 *
 * 呼び出し前に isLegalMove() で検証済みであること。
 */
export function applyAction(board: Board, action: Action, player: Player): Board {
  const { row, col, shape } = action;

  const newCell: Cell = {
    anchors: [
      ...board[row][col].anchors,
      { player, shape },
    ],
  };

  return board.map((rowArr, r) =>
    r === row
      ? rowArr.map((cell, c) => (c === col ? newCell : cell))
      : rowArr,
  );
}

/**
 * 指定サイズの空の Board を生成する。
 */
export function createEmptyBoard(size: number): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ anchors: [] })),
  );
}
