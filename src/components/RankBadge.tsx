/**
 * JIBA — RankBadge コンポーネント
 * 段位・ポイントの表示。
 * compact: ScoreBar 埋め込み用ワンライナー
 * normal: ResultOverlay 用（アイコン + ランク + ポイントバー + delta）
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RatingState, RatingDelta, rankLabel } from '../engine/rankEngine';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface RankBadgeProps {
  rating: RatingState;
  size?: 'compact' | 'normal';
  delta?: RatingDelta | null;
}

export const RankBadge = React.memo<RankBadgeProps>(({
  rating,
  size = 'normal',
  delta,
}) => {
  const label = rankLabel(rating.rank);

  // ── compact モード（ScoreBar 用） ──────────────────────────
  if (size === 'compact') {
    return (
      <Text style={styles.compact}>
        {label}
      </Text>
    );
  }

  // ── normal モード（ResultOverlay 用） ──────────────────────
  const deltaSign = delta && delta.pointsDelta > 0 ? '+' : '';
  const deltaColor =
    delta?.direction === 'up'   ? Colors.timerNormal :
    delta?.direction === 'down' ? Colors.timerWarning :
    Colors.textSecondary;

  const progressWidth = `${Math.max(0, Math.min(100, rating.points))}%` as `${number}%`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {delta && (
          <Text style={[styles.delta, { color: deltaColor }]}>
            {deltaSign}{delta.pointsDelta}P
          </Text>
        )}
      </View>

      {/* ポイントバー */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: progressWidth }]} />
      </View>

      <Text style={styles.pointsText}>
        {rating.points} / 100 P
        {delta?.rankChanged && (
          <Text style={{ color: deltaColor }}>
            {delta.direction === 'up' ? '  ⬆ 昇段！' : '  ⬇ 降格'}
          </Text>
        )}
      </Text>
    </View>
  );
});

RankBadge.displayName = 'RankBadge';

const styles = StyleSheet.create({
  // compact
  compact: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // normal
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  delta: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  barBackground: {
    height: 6,
    backgroundColor: Colors.neutral,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.timerNormal,
    borderRadius: 3,
  },
  pointsText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
