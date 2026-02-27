/**
 * JIBA — ゲーム設定定数
 */

import { GameMode, BOARD_SIZE, MAX_MOVES } from '../engine/types';

export { BOARD_SIZE, MAX_MOVES };

/** タイムアウトまでの秒数 */
export const TURN_SECONDS = 20;

/** タイマー警告閾値（秒）: この値以下で色変化 + 振動 */
export const TIMER_WARNING_SECONDS = 5;

/** ShapeKind の表示ラベル */
export const SHAPE_LABELS: Record<string, string> = {
  weak: '弱',
  mid_cross: '中■',
  mid_diag: '中×',
  strong_vert: '強|',
  strong_horiz: '強─',
  strong_diag_nwse: '強↖',
  strong_diag_nesw: '強↗',
};

/** デフォルトのゲームモード */
export const DEFAULT_MODE: GameMode = 'quick';
