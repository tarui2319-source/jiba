/**
 * JIBA — ConnectionFailedBanner コンポーネント
 * MAX_RETRIES を超過して Realtime 再接続を断念したときに
 * 全面表示するエラーオーバーレイ。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { useI18n } from '../i18n';

interface ConnectionFailedBannerProps {
  onGoHome: () => void;
}

export const ConnectionFailedBanner = React.memo<ConnectionFailedBannerProps>(({ onGoHome }) => {
  const { t } = useI18n();
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.title}>{t('connection_failed_title')}</Text>
        <Text style={styles.message}>{t('connection_failed_msg')}</Text>
        <TouchableOpacity style={styles.button} onPress={onGoHome} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{t('go_home')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

ConnectionFailedBanner.displayName = 'ConnectionFailedBanner';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,8,18,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    width: '82%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.redLight,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.blue,
    width: '100%',
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
