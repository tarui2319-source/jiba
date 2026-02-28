/**
 * JIBA CPU — 評価関数
 * 純粋関数。engine 以外への依存なし。
 */

import { Board, Player, Action, CellState } from '../engine/types';
import { applyAction } from '../engine/applyAction';
import { computeInfluence } from '../engine/influence';

/**
 * ボード状態を評価して「player にとっての有利度」を返す。
 *
 * @param influence   computeInfluence の結果
 * @param player      評価視点のプレイヤー
 * @param includePower true=支配マス差+0.01×影響力差（Lv3/4用）
 *                     false=支配マス差のみ（Lv2用、整数比較）
 */
export function scoreBoard(
  influence: CellState[][],
  player: Player,
  includePower = true,
): number {
  let firstCount = 0;
  let secondCount = 0;
  let totalD = 0; // Σ(first_inf - second_inf) 全マス合計

  for (const row of influence) {
    for (const cell of row) {
      if (cell.controller === 'first') firstCount++;
      else if (cell.controller === 'second') secondCount++;
      totalD += cell.d;
    }
  }

  // first=+1, second=-1 の符号で視点を合わせる
  const sign = player === 'first' ? 1 : -1;
  const controlled = sign * (firstCount - secondCount);

  if (!includePower) return controlled;

  // 0.01 係数でタイブレーク用の微小項として機能する
  return controlled + 0.01 * sign * totalD;
}

/**
 * 特定の手を打ったあとのボードを評価する。
 *
 * @param board         現在の盤面
 * @param action        評価対象の手
 * @param player        手を打つプレイヤー
 * @param size          盤面サイズ
 * @param includePower  scoreBoard の同名引数
 */
export function scoreMove(
  board: Board,
  action: Action,
  player: Player,
  size: number,
  includePower = true,
): number {
  const nextBoard = applyAction(board, action, player);
  const influence = computeInfluence(nextBoard, size);
  return scoreBoard(influence, player, includePower);
}
