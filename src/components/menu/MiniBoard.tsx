/**
 * チュートリアル用ミニボード描画プリミティブ
 */

import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../constants/theme';

// ──────────────────────────────────────────────────────────────
// 型・定数
// ──────────────────────────────────────────────────────────────

export type CellColor =
  | 'empty'
  | 'first'
  | 'first_sel'        // blue + 黄色枠（設置可能マスを示す）
  | 'second'
  | 'selected'
  | 'influence'
  | 'influence_strong'
  | 'second_inf';      // SECOND の影響圏（半透明）

export const CELL_BG: Record<CellColor, string> = {
  empty:            Colors.bg,
  first:            Colors.blue,
  first_sel:        Colors.blue,
  second:           Colors.red,
  selected:         Colors.bg,
  influence:        'rgba(79,142,247,0.28)',
  influence_strong: 'rgba(79,142,247,0.52)',
  second_inf:       'rgba(240,82,82,0.28)',
};

// ──────────────────────────────────────────────────────────────
// MiniBoard — ラベルなしミニボード
// ──────────────────────────────────────────────────────────────

interface MiniBoardProps {
  board: CellColor[][];
  cellSize: number;
}

export const MiniBoard = memo<MiniBoardProps>(({ board, cellSize }) => (
  <View>
    {board.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row' }}>
        {row.map((cell, ci) => (
          <View
            key={ci}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: CELL_BG[cell],
              borderWidth: (cell === 'selected' || cell === 'first_sel') ? 2 : 0.5,
              borderColor: (cell === 'selected' || cell === 'first_sel')
                ? Colors.selectedBorder
                : Colors.borderSubtle,
            }}
          />
        ))}
      </View>
    ))}
  </View>
));
MiniBoard.displayName = 'MiniBoard';

// ──────────────────────────────────────────────────────────────
// MiniBoardLabeled — 数値オーバーレイ付きミニボード
// ──────────────────────────────────────────────────────────────

interface MiniBoardLabeledProps {
  board: CellColor[][];
  labels: (string | null)[][];
  cellSize: number;
}

export const MiniBoardLabeled = memo<MiniBoardLabeledProps>(({ board, labels, cellSize }) => (
  <View>
    {board.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row' }}>
        {row.map((cell, ci) => {
          const label = labels[ri]?.[ci] ?? null;
          return (
            <View
              key={ci}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: CELL_BG[cell],
                borderWidth: 0.5,
                borderColor: Colors.borderSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {label != null && (
                <Text
                  style={{
                    fontSize: Math.round(cellSize * 0.44),
                    fontWeight: '900',
                    color: Colors.white,
                    lineHeight: Math.round(cellSize * 0.5),
                  }}
                >
                  {label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    ))}
  </View>
));
MiniBoardLabeled.displayName = 'MiniBoardLabeled';
