/**
 * JIBA — Board コンポーネント
 * グリッド全体を描画する。
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Board as BoardData, CellState, Player } from '../engine/types';
import { Cell } from './Cell';
import { Spacing } from '../constants/theme';

interface BoardProps {
  board: BoardData;
  influence: CellState[][];
  size: number;
  selectedCell: { row: number; col: number } | null;
  currentPlayer: Player;
  onCellPress: (row: number, col: number) => void;
}

export const Board = React.memo<BoardProps>(({
  board, influence, size, selectedCell, currentPlayer, onCellPress,
}) => {
  const { width, height } = useWindowDimensions();
  const cellSize = useMemo(() => {
    // ScoreBar≈145 + ShapeSelector≈100 + ActionBar≈65 + margins≈20
    const CHROME_HEIGHT = 330;
    const maxByWidth  = Math.floor((width  - Spacing.lg * 2) / size);
    const maxByHeight = Math.floor((height - CHROME_HEIGHT)  / size);
    return Math.min(maxByWidth, maxByHeight);
  }, [width, height, size]);

  return (
    <View style={styles.container}>
      {board.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              row={r}
              col={c}
              cellData={cell}
              cellState={influence[r][c]}
              cellSize={cellSize}
              isSelected={selectedCell?.row === r && selectedCell?.col === c}
              isCurrentPlayer={true}
              onPress={onCellPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

Board.displayName = 'Board';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
  },
});
