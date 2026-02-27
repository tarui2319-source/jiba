/**
 * JIBA — SetupOverlay コンポーネント
 * ゲーム開始前・対局後に表示する対戦モード・難易度選択UI。
 * MVP8-A: タイトルビジュアル強化・クリーンレイアウト
 * i18n: 日英切替対応
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { CpuDifficulty } from '../constants/cpuConfig';
import { RatingState } from '../engine/rankEngine';
import { RankBadge } from './RankBadge';
import { useI18n, Locale } from '../i18n';

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

const MODE_EMOJIS: Record<GameMode, string> = {
  local: '👥',
  cpu: '🤖',
  online: '🌐',
};

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

export const SetupOverlay = React.memo<SetupOverlayProps>(({
  gameMode, cpuDifficulty, onSetGameMode, onSetDifficulty, onStart, rating,
}) => {
  const { t, locale, setLocale } = useI18n();

  const startLabel = gameMode === 'online' ? t('matchmaking_start') : t('start');

  const modeButtons = useMemo(() => [
    { mode: 'local'  as GameMode, label: t('mode_local') },
    { mode: 'cpu'    as GameMode, label: t('mode_cpu') },
    { mode: 'online' as GameMode, label: t('mode_online') },
  ], [t]);

  const diffLabels: Record<CpuDifficulty, string> = useMemo(() => ({
    1: t('diff_1'),
    2: t('diff_2'),
    3: t('diff_3'),
    4: t('diff_4'),
  }), [t]);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>

        {/* ── タイトルヘッダー ─────────────────────────── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('game_title')}</Text>
          <Text style={styles.subtitle}>{t('game_subtitle')}</Text>
        </View>

        {/* ── 段位バッジ ───────────────────────────────── */}
        {rating && (
          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>{t('your_rank')}</Text>
            <RankBadge rating={rating} size="normal" />
          </View>
        )}

        {/* ── 対戦モード ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('battle_mode')}</Text>
          <View style={styles.modeRow}>
            {modeButtons.map(({ mode, label }) => {
              const active = gameMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, active && styles.modeBtnActive]}
                  onPress={() => onSetGameMode(mode)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.modeEmoji}>{MODE_EMOJIS[mode]}</Text>
                  <Text style={[styles.modeText, active && styles.modeTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── CPU難易度 ────────────────────────────────── */}
        {gameMode === 'cpu' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('cpu_difficulty')}</Text>
            <View style={styles.diffRow}>
              {DIFFICULTIES.map((lv) => {
                const active = cpuDifficulty === lv;
                return (
                  <TouchableOpacity
                    key={lv}
                    style={[styles.diffBtn, active && styles.diffBtnActive]}
                    onPress={() => onSetDifficulty(lv)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.diffText, active && styles.diffTextActive]}>
                      {diffLabels[lv]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 言語切替 ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('language')}</Text>
          <View style={styles.langRow}>
            {LOCALES.map(({ value, label }) => {
              const active = locale === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                  onPress={() => setLocale(value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── スタートボタン ───────────────────────────── */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>{startLabel}</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
});

SetupOverlay.displayName = 'SetupOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,8,18,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    width: '88%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // タイトル
  titleBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: Colors.blue,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },

  // 段位カード
  rankCard: {
    width: '100%',
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  rankLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // セクション
  section: {
    width: '100%',
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // モードボタン
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 3,
  },
  modeBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  modeEmoji: {
    fontSize: 18,
  },
  modeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeTextActive: {
    color: Colors.white,
  },

  // 難易度
  diffRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  diffBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    minWidth: 70,
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

  // 言語切替
  langRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  langBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  langText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  langTextActive: {
    color: Colors.white,
  },

  // スタートボタン
  startBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.blue,
    width: '100%',
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  startBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
