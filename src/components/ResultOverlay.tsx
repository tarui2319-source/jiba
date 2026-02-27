/**
 * JIBA — ResultOverlay コンポーネント
 * ゲーム終了時の結果表示オーバーレイ。
 * MVP8-A: 勝者バナー強化・スコア比較・段位変動をクリーンに
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { GameResult, Player } from '../engine/types';
import { RatingState, RatingDelta } from '../engine/rankEngine';
import { RankBadge } from './RankBadge';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

interface ResultOverlayProps {
  result: GameResult;
  onRestart: () => void;
  ratingDelta?: RatingDelta | null;
  currentRating?: RatingState | null;
  surrenderedBy?: Player;
}

export const ResultOverlay = React.memo<ResultOverlayProps>(({
  result, onRestart, ratingDelta, currentRating, surrenderedBy,
}) => {
  // ── フェードイン ────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 280, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 280, useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── 表示テキスト ────────────────────────────────────
  const isWinnerBlue  = result.winner === 'blue';
  const isWinnerRed   = result.winner === 'red';
  const isDraw        = result.winner === 'draw';
  const isSurrender   = !!surrenderedBy;

  const winnerColor = isWinnerBlue ? Colors.blue
                    : isWinnerRed  ? Colors.red
                    : Colors.neutralText;

  const bannerBg    = isWinnerBlue ? Colors.blueTint
                    : isWinnerRed  ? Colors.redTint
                    : 'rgba(255,255,255,0.04)';

  const bannerBorder = isWinnerBlue ? Colors.blue
                     : isWinnerRed  ? Colors.red
                     : Colors.border;

  const resultEmoji  = isSurrender  ? '🏳️'
                     : isWinnerBlue ? '🟦'
                     : isWinnerRed  ? '🟥'
                     : '🤝';

  const resultMain   = isSurrender
    ? `${surrenderedBy === 'blue' ? 'BLUE' : 'RED'} が降参`
    : isWinnerBlue  ? 'BLUE の勝ち！'
    : isWinnerRed   ? 'RED の勝ち！'
    : '引き分け';

  // スコア合計でバーの幅比率を計算
  const total = result.blueCount + result.redCount;
  const bluePct = total > 0 ? result.blueCount / total : 0.5;
  const redPct  = total > 0 ? result.redCount  / total : 0.5;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── 勝者バナー ────────────────────────────── */}
        <View style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
          <Text style={styles.bannerEmoji}>{resultEmoji}</Text>
          <Text style={[styles.bannerText, { color: winnerColor }]}>{resultMain}</Text>
        </View>

        {/* ── スコア比較バー ─────────────────────────── */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: Colors.blueLight }]}>{result.blueCount}</Text>
            <Text style={styles.scoreLabel}>マス</Text>
            <Text style={styles.scoreSep}>vs</Text>
            <Text style={styles.scoreLabel}>マス</Text>
            <Text style={[styles.scoreNum, { color: Colors.redLight }]}>{result.redCount}</Text>
          </View>

          {/* 横バー */}
          <View style={styles.barTrack}>
            <View style={[styles.barBlue, { flex: bluePct }]} />
            <View style={[styles.barRed, { flex: redPct }]} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.powerText, { color: Colors.blueLight }]}>
              力: {result.bluePower}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.powerText, { color: Colors.redLight }]}>
              力: {result.redPower}
            </Text>
          </View>
        </View>

        {/* ── 段位変動 ────────────────────────────────── */}
        {currentRating && (
          <View style={styles.rankSection}>
            <Text style={styles.rankSectionLabel}>あなたの段位</Text>
            <RankBadge rating={currentRating} size="normal" delta={ratingDelta} />
          </View>
        )}

        {/* ── もう一度ボタン ────────────────────────── */}
        <TouchableOpacity
          style={styles.restartBtn}
          onPress={onRestart}
          activeOpacity={0.8}
        >
          <Text style={styles.restartBtnText}>もう一度</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

ResultOverlay.displayName = 'ResultOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,8,18,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'stretch',
    width: '86%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // 勝者バナー
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  bannerEmoji: {
    fontSize: FontSize.xl,
  },
  bannerText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // スコア比較
  scoreSection: {
    gap: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  scoreNum: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  scoreSep: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.xs,
  },
  barTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  barBlue: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.full,
  },
  barRed: {
    backgroundColor: Colors.red,
    borderRadius: Radius.full,
  },
  powerText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // 段位
  rankSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  rankSectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ボタン
  restartBtn: {
    backgroundColor: Colors.blue,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  restartBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
