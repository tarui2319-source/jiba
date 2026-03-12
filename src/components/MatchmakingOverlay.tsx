/**
 * JIBA — MatchmakingOverlay コンポーネント
 * マッチング中・待機中・エラー状態のオーバーレイ表示。
 * zIndex: 300（SetupOverlay:200 より上）
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MatchmakingState } from '../hooks/useMatchmaking';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { useI18n } from '../i18n';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

interface MatchmakingOverlayProps {
  matchState: MatchmakingState;
  onCancel: () => void;
  /** エラー時の再試行コールバック（再試行可能な場合のみ表示） */
  onRetry?: () => void;
}

// ──────────────────────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────────────────────

export const MatchmakingOverlay = React.memo<MatchmakingOverlayProps>(
  ({ matchState, onCancel, onRetry }) => {
    const { t } = useI18n();
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // waiting_for_opponent 時に経過秒をカウント
    useEffect(() => {
      if (matchState.status === 'waiting_for_opponent') {
        setElapsed(0);
        timerRef.current = setInterval(() => {
          setElapsed(prev => prev + 1);
        }, 1_000);
      } else {
        if (timerRef.current != null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setElapsed(0);
      }
      return () => {
        if (timerRef.current != null) {
          clearInterval(timerRef.current);
        }
      };
    }, [matchState.status]);

    // 表示対象外のステータスは何も描画しない
    if (
      matchState.status !== 'searching' &&
      matchState.status !== 'waiting_for_opponent' &&
      matchState.status !== 'error'
    ) {
      return null;
    }

    return (
      <View style={styles.overlay}>
        <View style={styles.card}>
          {matchState.status === 'searching' && (
            <>
              <ActivityIndicator size="large" color={Colors.blue} />
              <Text style={styles.primaryText}>{t('searching')}</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          )}

          {matchState.status === 'waiting_for_opponent' && (
            <>
              <ActivityIndicator size="large" color={Colors.blue} />
              <Text style={styles.primaryText}>{t('waiting_for_opponent')}</Text>
              <Text style={styles.elapsedText}>{t('elapsed_sec', { n: elapsed })}</Text>
              <Text style={styles.waitingCountText}>{t('waiting_count', { n: matchState.waitingCount })}</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          )}

          {matchState.status === 'error' && (
            <>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{matchState.message}</Text>
              <View style={styles.buttonRow}>
                {onRetry != null && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onRetry}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>{t('retry')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    );
  },
);

MatchmakingOverlay.displayName = 'MatchmakingOverlay';

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '80%',
    gap: Spacing.md,
  },
  primaryText: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  elapsedText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  waitingCountText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  errorIcon: {
    fontSize: 36,
  },
  errorText: {
    color: Colors.redLight,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: Colors.neutral,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
