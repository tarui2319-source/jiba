/**
 * JIBA — ResultOverlay コンポーネント
 * ゲーム終了時の結果表示オーバーレイ。
 * オンライン対戦時は段位変動（RankBadge）を表示する。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GameResult, Player } from '../engine/types';
import { RatingState, RatingDelta } from '../engine/rankEngine';
import { RankBadge } from './RankBadge';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface ResultOverlayProps {
  result: GameResult;
  onRestart: () => void;
  /** オンライン対戦時のみ渡す */
  ratingDelta?: RatingDelta | null;
  /** オンライン対戦時のみ渡す */
  currentRating?: RatingState | null;
  /** 降参したプレイヤー */
  surrenderedBy?: Player;
}

export const ResultOverlay = React.memo<ResultOverlayProps>(({
  result, onRestart, ratingDelta, currentRating, surrenderedBy,
}) => {
  const winnerLabel = surrenderedBy
    ? (surrenderedBy === 'blue' ? '🏳️ BLUE が降参' : '🏳️ RED が降参')
    : result.winner === 'blue' ? '🟦 BLUE の勝ち！'
    : result.winner === 'red'  ? '🟥 RED の勝ち！'
    : '🤝 引き分け';

  const winnerColor =
    result.winner === 'blue' ? Colors.blueLight :
    result.winner === 'red'  ? Colors.redLight :
    Colors.textPrimary;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={[styles.resultText, { color: winnerColor }]}>{winnerLabel}</Text>
        <View style={styles.stats}>
          <Text style={[styles.statText, { color: Colors.blueLight }]}>
            BLUE: {result.blueCount}マス (力:{result.bluePower})
          </Text>
          <Text style={[styles.statText, { color: Colors.redLight }]}>
            RED:  {result.redCount}マス (力:{result.redPower})
          </Text>
        </View>

        {/* 段位変動（オンライン対戦時のみ） */}
        {currentRating && (
          <View style={styles.rankSection}>
            <Text style={styles.rankTitle}>あなたの段位</Text>
            <RankBadge rating={currentRating} size="normal" delta={ratingDelta} />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={onRestart} activeOpacity={0.8}>
          <Text style={styles.buttonText}>もう一度</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

ResultOverlay.displayName = 'ResultOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '80%',
    gap: Spacing.md,
  },
  resultText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  stats: {
    gap: Spacing.xs,
    alignItems: 'flex-start',
    width: '100%',
  },
  statText: {
    fontSize: FontSize.md,
    fontVariant: ['tabular-nums'],
  },
  rankSection: {
    width: '100%',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rankTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  button: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
