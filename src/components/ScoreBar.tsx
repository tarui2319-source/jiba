/**
 * JIBA — ScoreBar コンポーネント
 * 上部: スコア（自色マス数）+ タイマー
 * MVP8-A: アクティブプレイヤーをプレイヤー色で明示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '../engine/types';
import { RatingState } from '../engine/rankEngine';
import { RankBadge } from './RankBadge';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { useI18n } from '../i18n';

interface ScoreBarProps {
  firstCount: number;
  secondCount: number;
  currentPlayer: Player;
  timerSeconds: number;
  isTimerWarning: boolean;
  movesLeft: Record<Player, number>;
  myPlayer?: 'first' | 'second' | null;
  myRating?: RatingState | null;
}

export const ScoreBar = React.memo<ScoreBarProps>(({
  firstCount, secondCount, currentPlayer, timerSeconds, isTimerWarning, movesLeft,
  myPlayer, myRating,
}) => {
  const { t } = useI18n();
  const isBlueActive = currentPlayer === 'first';
  const isRedActive  = currentPlayer === 'second';

  return (
    <View style={styles.container}>
      {/* Blue スコア */}
      <View style={[
        styles.playerBlock,
        isBlueActive ? styles.activeBlockBlue : styles.inactiveBlock,
      ]}>
        <Text style={[styles.playerLabel, { color: isBlueActive ? Colors.blue : Colors.textMuted }]}>
          {t('player_first')}
        </Text>
        <Text style={[styles.score, { color: isBlueActive ? Colors.blueLight : Colors.neutralText }]}>
          {firstCount}
        </Text>
        <Text style={[styles.movesLeft, { color: isBlueActive ? Colors.textSecondary : Colors.textMuted }]}>
          {t('moves_left', { n: movesLeft.first })}
        </Text>
        {myPlayer === 'first' && myRating && (
          <RankBadge rating={myRating} size="compact" />
        )}
      </View>

      {/* タイマー */}
      <View style={styles.timerBlock}>
        <Text style={[
          styles.timerText,
          { color: isTimerWarning ? Colors.timerWarning : Colors.timerNormal },
        ]}>
          ⏱ {timerSeconds}s
        </Text>
        {/* ターンインジケーター */}
        <Text style={[
          styles.turnIndicator,
          { color: isBlueActive ? Colors.blue : Colors.red },
        ]}>
          {isBlueActive ? `◀  ${t('player_first')}` : `${t('player_second')}  ▶`}
        </Text>
      </View>

      {/* Red スコア */}
      <View style={[
        styles.playerBlock,
        isRedActive ? styles.activeBlockRed : styles.inactiveBlock,
      ]}>
        <Text style={[styles.playerLabel, { color: isRedActive ? Colors.red : Colors.textMuted }]}>
          {t('player_second')}
        </Text>
        <Text style={[styles.score, { color: isRedActive ? Colors.redLight : Colors.neutralText }]}>
          {secondCount}
        </Text>
        <Text style={[styles.movesLeft, { color: isRedActive ? Colors.textSecondary : Colors.textMuted }]}>
          {t('moves_left', { n: movesLeft.second })}
        </Text>
        {myPlayer === 'second' && myRating && (
          <RankBadge rating={myRating} size="compact" />
        )}
      </View>
    </View>
  );
});

ScoreBar.displayName = 'ScoreBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playerBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
    minWidth: 80,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inactiveBlock: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  activeBlockBlue: {
    backgroundColor: Colors.blueTint,
    borderColor: Colors.blue,
  },
  activeBlockRed: {
    backgroundColor: Colors.redTint,
    borderColor: Colors.red,
  },
  playerLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  score: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  movesLeft: {
    fontSize: FontSize.xs,
  },
  timerBlock: {
    alignItems: 'center',
    gap: 2,
  },
  timerText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  turnIndicator: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
