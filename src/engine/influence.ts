/**
 * JIBA Engine — 影響力再計算エンジン
 * 純粋関数。副作用なし。
 */

import { Board, CellState } from './types';
import { SHAPE_DEFS } from './shapes';

/**
 * 盤面全マスの影響力を計算して返す。
 * 元の Board は変更しない。
 *
 * @param board Board[row][col]
 * @param size  盤面サイズ（6 or 9）
 * @returns     CellState[row][col]
 */
export function computeInfluence(board: Board, size: number): CellState[][] {
  // first / second の生影響力を蓄積する2次元配列を初期化
  const first  = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const second = Array.from({ length: size }, () => new Array<number>(size).fill(0));

  // 全アンカーを走査して影響範囲に power を加算
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const { anchors } = board[r][c];
      for (const anchor of anchors) {
        const def = SHAPE_DEFS[anchor.shape];
        const target = anchor.player === 'first' ? first : second;
        for (const [dr, dc] of def.offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            target[nr][nc] += def.power;
          }
        }
      }
    }
  }

  // CellState[][] を構築
  const result: CellState[][] = [];
  for (let r = 0; r < size; r++) {
    result[r] = [];
    for (let c = 0; c < size; c++) {
      const f = first[r][c];
      const s = second[r][c];
      const d = f - s;
      result[r][c] = {
        first: f,
        second: s,
        d,
        controller: d > 0 ? 'first' : d < 0 ? 'second' : 'neutral',
        displayValue: Math.abs(d),
      };
    }
  }

  // ルール: アンカーを置いたマスは置いたプレイヤーの恒久陣地
  // legalMoves の制約により、1マスのアンカーは全て同一プレイヤーが所有
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const { anchors } = board[r][c];
      if (anchors.length > 0) {
        result[r][c].controller = anchors[0].player;
      }
    }
  }

  return result;
}
