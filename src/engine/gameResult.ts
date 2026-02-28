/**
 * JIBA Engine — 勝利判定
 * 純粋関数。副作用なし。
 */

import { CellState, GameResult } from './types';

/**
 * 最終ターン終了時の勝利判定。
 * 仕様書準拠の優先順位:
 *   1. 自色マス数が多い方が勝利
 *   2. 同数: |D(c)| 総和が大きい方
 *   3. それも同じ: ドロー
 *
 * @param influence computeInfluence() の戻り値
 */
export function getResult(influence: CellState[][]): GameResult {
  let firstCount = 0;
  let secondCount = 0;
  let neutralCount = 0;
  let firstPower = 0;
  let secondPower = 0;

  for (const row of influence) {
    for (const cell of row) {
      if (cell.controller === 'first') {
        firstCount++;
        firstPower += cell.displayValue;
      } else if (cell.controller === 'second') {
        secondCount++;
        secondPower += cell.displayValue;
      } else {
        neutralCount++;
      }
    }
  }

  let winner: GameResult['winner'];
  if (firstCount !== secondCount) {
    winner = firstCount > secondCount ? 'first' : 'second';
  } else if (firstPower !== secondPower) {
    winner = firstPower > secondPower ? 'first' : 'second';
  } else {
    winner = 'draw';
  }

  return { winner, firstCount, secondCount, neutralCount, firstPower, secondPower };
}
