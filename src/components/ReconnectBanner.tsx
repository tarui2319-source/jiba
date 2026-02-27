/**
 * JIBA — ReconnectBanner コンポーネント
 * Realtime チャンネル切断時に画面上部に表示する再接続中バナー。
 * isReconnecting=true のときのみ GameScreen から条件レンダリングで使用。
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { useI18n } from '../i18n';

export const ReconnectBanner = React.memo(() => {
  const { t } = useI18n();
  return (
    <View style={styles.banner}>
      <ActivityIndicator size="small" color={Colors.timerNormal} />
      <Text style={styles.text}>{t('reconnecting')}</Text>
    </View>
  );
});

ReconnectBanner.displayName = 'ReconnectBanner';

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.80)',
    zIndex: 200,
  },
  text: {
    color: Colors.timerNormal,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
