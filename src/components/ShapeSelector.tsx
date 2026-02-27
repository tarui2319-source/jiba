/**
 * JIBA — ShapeSelector コンポーネント
 * ShapeKind 7種の選択ボタン。3×3 Wave グリッドで波形を可視化。
 * MVP8-A: カードUI洗練・選択状態を鮮明に
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShapeKind } from '../engine/types';
import { ALL_SHAPES, SHAPE_DEFS } from '../engine/shapes';
import { Colors, FontSize, Spacing, MIN_TAP } from '../constants/theme';
import { useI18n } from '../i18n';

const MINI_CELL = 11;
const MINI_GAP  = 1.5;

interface ShapePreviewProps {
  shape: ShapeKind;
  isSelected: boolean;
}

const ShapePreview = React.memo<ShapePreviewProps>(({ shape, isSelected }) => {
  const def = SHAPE_DEFS[shape];
  const affectedSet = new Set(
    def.offsets.map(([dr, dc]) => `${dr + 1},${dc + 1}`),
  );

  return (
    <View style={previewStyles.wrapper}>
      <View style={previewStyles.grid}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={previewStyles.gridRow}>
            {[0, 1, 2].map((c) => {
              const isCenter   = r === 1 && c === 1;
              const isAffected = affectedSet.has(`${r},${c}`);
              return (
                <View
                  key={c}
                  style={[
                    previewStyles.miniCell,
                    isCenter   && previewStyles.centerCell,
                    isAffected && (isSelected
                      ? previewStyles.affectedSelected
                      : previewStyles.affected),
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      {/* パワー数字 */}
      <Text style={[previewStyles.powerText, isSelected && previewStyles.powerTextSelected]}>
        {def.power}
      </Text>
    </View>
  );
});

ShapePreview.displayName = 'ShapePreview';

interface ShapeSelectorProps {
  selectedShape: ShapeKind | null;
  onSelect: (shape: ShapeKind) => void;
}

export const ShapeSelector = React.memo<ShapeSelectorProps>(({
  selectedShape, onSelect,
}) => {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('wave')}</Text>
      <View style={styles.row}>
        {(ALL_SHAPES as ShapeKind[]).map((shape) => {
          const isSel = selectedShape === shape;
          return (
            <TouchableOpacity
              key={shape}
              onPress={() => onSelect(shape)}
              activeOpacity={0.7}
              style={[styles.button, isSel && styles.buttonSelected]}
            >
              <ShapePreview shape={shape} isSelected={isSel} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

ShapeSelector.displayName = 'ShapeSelector';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    letterSpacing: 2,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP,
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    backgroundColor: Colors.blueDim,
    borderColor: Colors.blue,
    borderWidth: 1.5,
  },
});

const previewStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 3,
  },
  grid: {
    gap: MINI_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: MINI_GAP,
  },
  miniCell: {
    width: MINI_CELL,
    height: MINI_CELL,
    backgroundColor: Colors.border,
    borderRadius: 1.5,
  },
  centerCell: {
    backgroundColor: Colors.neutralText,
  },
  affected: {
    backgroundColor: '#2a4a7a',
  },
  affectedSelected: {
    backgroundColor: Colors.blue,
  },
  powerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  powerTextSelected: {
    color: Colors.blueLight,
  },
});
