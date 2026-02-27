/**
 * JIBA Engine — ShapeType 定義
 * 各 ShapeKind の影響オフセット（[rowDelta, colDelta][]）と power
 */

import { ShapeKind } from './types';

export interface ShapeDef {
  /** 影響を与えるマスの相対座標 */
  offsets: ReadonlyArray<readonly [number, number]>;
  /** 影響力の大きさ */
  power: number;
}

export const SHAPE_DEFS: Readonly<Record<ShapeKind, ShapeDef>> = {
  weak: {
    offsets: [
      [-1, -1], [-1, 0], [-1, 1],
      [ 0, -1],          [ 0, 1],
      [ 1, -1], [ 1, 0], [ 1, 1],
    ],
    power: 1,
  },
  mid_cross: {
    offsets: [
      [-1, 0],
      [ 0, -1], [0, 1],
      [ 1, 0],
    ],
    power: 2,
  },
  mid_diag: {
    offsets: [
      [-1, -1], [-1, 1],
      [ 1, -1], [ 1, 1],
    ],
    power: 2,
  },
  strong_vert: {
    offsets: [
      [-1, 0],
      [ 1, 0],
    ],
    power: 4,
  },
  strong_horiz: {
    offsets: [
      [0, -1],
      [0,  1],
    ],
    power: 4,
  },
  /** ↖↘ 方向 */
  strong_diag_nwse: {
    offsets: [
      [-1, -1],
      [ 1,  1],
    ],
    power: 4,
  },
  /** ↗↙ 方向 */
  strong_diag_nesw: {
    offsets: [
      [-1, 1],
      [ 1, -1],
    ],
    power: 4,
  },
} as const;

/** 全 ShapeKind の配列（UI 選択肢などに利用） */
export const ALL_SHAPES: readonly ShapeKind[] = Object.keys(SHAPE_DEFS) as ShapeKind[];
