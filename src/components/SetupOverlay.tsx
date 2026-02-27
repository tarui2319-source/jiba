/**
 * JIBA — SetupOverlay コンポーネント
 * ゲーム開始前・対局後に表示する対戦モード・難易度選択UI。
 * MVP5: gameMode に 'online' を追加。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import {
  CpuDifficulty,
  CPU_DIFFICULTY_LABELS,
} from '../constants/cpuConfig';
import { RatingState } from '../engine/rankEngine';
import { RankBadge } from './RankBadge';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export type GameMode = 'local' | 'cpu' | 'online';

interface SetupOverlayProps {
  gameMode: GameMode;
  cpuDifficulty: CpuDifficulty;
  onSetGameMode: (m: GameMode) => void;
  onSetDifficulty: (d: CpuDifficulty) => void;
  onStart: () => void;
  rating?: RatingState | null;
}

const DIFFICULTIES: CpuDifficulty[] = [1, 2, 3, 4];

const MODE_BUTTONS: { mode: GameMode; label: string }[] = [
  { mode: 'local',  label: '👥 2人対戦' },
  { mode: 'cpu',    label: '🤖 CPU対戦' },
  { mode: 'online', label: '🌐 オンライン' },
];

// ──────────────────────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────────────────────

export const SetupOverlay = React.memo<SetupOverlayProps>(({
  gameMode, cpuDifficulty, onSetGameMode, onSetDifficulty, onStart, rating,
}) => {
  const startLabel = gameMode === 'online' ? 'マッチング開始' : 'スタート';

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* タイトル */}
        <Text style={styles.title}>JIBA</Text>
        <Text style={styles.subtitle}>陣地争い戦略ゲーム</Text>

        {/* 段位・ポイント表示 */}
        {rating && (
          <View style={styles.rankSection}>
            <RankBadge rating={rating} size="normal" />
          </View>
        )}

        {/* モード選択（3ボタン横並び） */}
        <Text style={styles.sectionLabel}>対戦モード</Text>
        <View style={styles.toggleRow}>
          {MODE_BUTTONS.map(({ mode, label }) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, gameMode === mode && styles.toggleBtnActive]}
              onPress={() => onSetGameMode(mode)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, gameMode === mode && styles.toggleTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 難易度選択（CPU対戦時のみ） */}
        {gameMode === 'cpu' && (
          <>
            <Text style={styles.sectionLabel}>CPU難易度</Text>
            <View style={styles.difficultyGrid}>
              {DIFFICULTIES.map((lv) => (
                <TouchableOpacity
                  key={lv}
                  style={[
                    styles.diffBtn,
                    cpuDifficulty === lv && styles.diffBtnActive,
                  ]}
                  onPress={() => onSetDifficulty(lv)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.diffText,
                    cpuDifficulty === lv && styles.diffTextActive,
                  ]}>
                    {CPU_DIFFICULTY_LABELS[lv]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* スタートボタン */}
        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={styles.startBtnText}>{startLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

SetupOverlay.displayName = 'SetupOverlay';

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '85%',
    gap: Spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.blueLight,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },
  rankSection: {
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  toggleBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  toggleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: Colors.white,
  },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
  },
  diffBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    minWidth: 80,
    alignItems: 'center',
  },
  diffBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  diffText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  diffTextActive: {
    color: Colors.white,
  },
  startBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  startBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
