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
  let blueCount = 0;
  let redCount = 0;
  let neutralCount = 0;
  let bluePower = 0;
  let redPower = 0;

  for (const row of influence) {
    for (const cell of row) {
      if (cell.controller === 'blue') {
        blueCount++;
        bluePower += cell.displayValue;
      } else if (cell.controller === 'red') {
        redCount++;
        redPower += cell.displayValue;
      } else {
        neutralCount++;
      }
    }
  }

  let winner: GameResult['winner'];
  if (blueCount !== redCount) {
    winner = blueCount > redCount ? 'blue' : 'red';
  } else if (bluePower !== redPower) {
    winner = bluePower > redPower ? 'blue' : 'red';
  } else {
    winner = 'draw';
  }

  return { winner, blueCount, redCount, neutralCount, bluePower, redPower };
}
