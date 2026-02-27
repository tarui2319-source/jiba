/**
 * JIBA — CPU対戦設定定数
 */

/** CPU難易度レベル（1=かんたん〜4=さいきょう） */
export type CpuDifficulty = 1 | 2 | 3 | 4;

/** 難易度表示ラベル */
export const CPU_DIFFICULTY_LABELS: Record<CpuDifficulty, string> = {
  1: 'かんたん',
  2: 'ふつう',
  3: 'むずかしい',
  4: 'さいきょう',
};

/**
 * CPU の「思考中」演出ディレイ（ミリ秒）
 * 難易度が高いほど長くして思考感を演出する。
 */
export const CPU_THINK_MS: Record<CpuDifficulty, number> = {
  1: 300,
  2: 500,
  3: 800,
  4: 1200,
};
