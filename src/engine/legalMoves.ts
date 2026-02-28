/**
 * JIBA Engine — 合法手列挙
 * 純粋関数。副作用なし。
 */

import { Board, Player, Action, ShapeKind } from './types';
import { ALL_SHAPES } from './shapes';
import { computeInfluence } from './influence';

/**
 * 指定プレイヤーの全合法手を返す。
 *
 * 合法手定義（仕様書準拠）:
 *   Build: anchors=[] かつ敵に支配されていない空マスに任意 ShapeKind を配置
 *   Stack: 自分のアンカーが1つ以上あるマスに任意 ShapeKind を追加
 *          （同じ ShapeKind の重ね置きも合法）
 *
 * @param board  Board[row][col]
 * @param player 手番プレイヤー
 * @param size   盤面サイズ
 */
export function getLegalMoves(board: Board, player: Player, size: number): Action[] {
  const moves: Action[] = [];
  const opponent: Player = player === 'first' ? 'second' : 'first';
  const cellStates = computeInfluence(board, size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const { anchors } = board[r][c];

      if (anchors.length === 0) {
        // 空マス → 敵に支配されていなければ Build（全 ShapeKind）
        if (cellStates[r][c].controller !== opponent) {
          for (const shape of ALL_SHAPES as ShapeKind[]) {
            moves.push({ type: 'build', row: r, col: c, shape });
          }
        }
      } else {
        // 非空マス → 自分のアンカーが1つ以上あれば Stack
        const hasOwn = anchors.some((a) => a.player === player);
        if (hasOwn) {
          for (const shape of ALL_SHAPES as ShapeKind[]) {
            moves.push({ type: 'stack', row: r, col: c, shape });
          }
        }
      }
    }
  }

  return moves;
}

/**
 * 指定のアクションが合法かどうかを検証する（サーバー権威検証用）。
 */
export function isLegalMove(
  board: Board,
  action: Action,
  player: Player,
  size: number,
): boolean {
  const { row, col } = action;
  if (row < 0 || row >= size || col < 0 || col >= size) return false;

  const { anchors } = board[row][col];

  if (action.type === 'build') {
    if (anchors.length !== 0) return false;
    // 敵に支配されているマスには Build 不可
    const opponent: Player = player === 'first' ? 'second' : 'first';
    const cellStates = computeInfluence(board, size);
    return cellStates[row][col].controller !== opponent;
  }

  // stack: 自分のアンカーが存在するマスのみ
  return anchors.some((a) => a.player === player);
}
