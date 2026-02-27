/**
 * JIBA Engine — タイムアウト時代打ち
 * タイマー管理は UI 層の責務。engine 層は手の選択のみ。
 */

import { Board, Player, Action } from './types';
import { getLegalMoves } from './legalMoves';

/**
 * 合法手からランダムに1手選んで返す。
 * 合法手がゼロの場合は null を返す（呼び出し元でスキップ扱い）。
 *
 * @param board   現在の盤面
 * @param player  手番プレイヤー
 * @param size    盤面サイズ
 * @param rand    乱数生成関数（デフォルト: Math.random）テストで差し替え可
 */
export function getRandomMove(
  board: Board,
  player: Player,
  size: number,
  rand: () => number = Math.random,
): Action | null {
  const moves = getLegalMoves(board, player, size);
  if (moves.length === 0) return null;
  const idx = Math.floor(rand() * moves.length);
  return moves[idx];
}
