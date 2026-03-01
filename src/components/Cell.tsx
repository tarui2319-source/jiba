/**
 * JIBA — Cell コンポーネント
 * 1マスの表示。影響値・背景色・アンカーの有無・選択状態。
 * MVP8-A: アンカー配置アニメーション（スケールパルス）追加
 */

import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { CellState, Cell as CellData, Player } from '../engine/types';
import { Colors } from '../constants/theme';

interface CellProps {
  row: number;
  col: number;
  cellData: CellData;
  cellState: CellState;
  cellSize: number;
  isSelected: boolean;
  isCurrentPlayer: boolean;
  onPress: (row: number, col: number) => void;
}

/** 影響値の強さに応じてセル背景色を決める（0〜最大値で段階変化） */
function bgColor(controller: Player | 'neutral', value: number): string {
  if (controller === 'first') {
    // 影響値が高いほど鮮やか（dim → 中間ブルー）
    return value >= 8 ? '#1e3a6e'
         : value >= 4 ? '#172f5c'
         : value >= 1 ? Colors.blueDim
         : Colors.surface;
  }
  if (controller === 'second') {
    return value >= 8 ? '#5a1a1a'
         : value >= 4 ? '#4a1515'
         : value >= 1 ? Colors.redDim
         : Colors.surface;
  }
  return Colors.surface;
}

function textColor(controller: Player | 'neutral'): string {
  if (controller === 'first') return Colors.blueLight;
  if (controller === 'second') return Colors.redLight;
  return Colors.neutralText;
}

export const Cell = React.memo<CellProps>(({
  row, col, cellData, cellState, cellSize, isSelected, isCurrentPlayer: _isCurrentPlayer, onPress,
}) => {
  const hasAnyAnchor = cellData.anchors.length > 0;
  const anchorPlayer = hasAnyAnchor ? cellData.anchors[0].player : null;

  // ── アンカー配置アニメーション ─────────────────────────
  const prevAnchorCount = useRef(cellData.anchors.length);
  // eslint-disable-next-line react-hooks/refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // eslint-disable-next-line react-hooks/refs
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (cellData.anchors.length > prevAnchorCount.current) {
      // 配置時: ポンッと弾むパルス
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.28,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.85,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.92,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevAnchorCount.current = cellData.anchors.length;
  }, [cellData.anchors.length, scaleAnim, opacityAnim]);

  // 背景色: アンカーあり→プレイヤーカラー、なし→影響値ベース
  const bg = hasAnyAnchor
    ? (anchorPlayer === 'first' ? Colors.blue : Colors.red)
    : bgColor(cellState.controller, cellState.displayValue);

  const anchorFontSize = Math.floor(cellSize * 0.4);

  return (
    <TouchableOpacity
      onPress={() => onPress(row, col)}
      activeOpacity={0.7}
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: bg,
        },
        isSelected && styles.selected,
      ]}
    >
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        {/* 影響値（アンカーがない場合のみ） */}
        {!hasAnyAnchor && cellState.displayValue > 0 && (
          <Text style={[styles.influenceText, { color: textColor(cellState.controller) }]}>
            {cellState.displayValue}
          </Text>
        )}
        {/* アンカーアイコン */}
        {hasAnyAnchor && (
          <Text style={[styles.anchorIcon, { fontSize: anchorFontSize }]}>⚓</Text>
        )}
        {/* スタック数 */}
        {cellData.anchors.length > 1 && (
          <Text style={[styles.stackCount, { fontSize: Math.max(7, Math.floor(cellSize * 0.22)) }]}>
            ×{cellData.anchors.length}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

Cell.displayName = 'Cell';

const styles = StyleSheet.create({
  cell: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  selected: {
    borderWidth: 2,
    borderColor: Colors.selectedBorder,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  influenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  anchorIcon: {
    color: Colors.white,
  },
  stackCount: {
    position: 'absolute',
    top: 1,
    left: 2,
    color: Colors.white,
    fontWeight: '700',
  },
});
