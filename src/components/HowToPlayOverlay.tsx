/**
 * JIBA — HowToPlayOverlay コンポーネント
 * SetupOverlay の「?」ボタンから呼び出すルール説明オーバーレイ。
 * - ScrollView でコンテンツが多くても対応可能
 * - Modal を使用するため zIndex 管理不要
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { useI18n } from '../i18n';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

interface HowToPlayOverlayProps {
  visible: boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────────────────────
// サブコンポーネント: セクション
// ──────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = React.memo<SectionProps>(({ title, children }) => (
  <View style={sectionStyles.container}>
    <Text style={sectionStyles.title}>{title}</Text>
    {children}
  </View>
));

Section.displayName = 'HowToSection';

const sectionStyles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.blue,
    marginBottom: 2,
  },
});

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────

export const HowToPlayOverlay = React.memo<HowToPlayOverlayProps>(({
  visible, onClose,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* ── タイトル ──────────────────────────── */}
          <Text style={styles.title}>{t('howto_title')}</Text>

          {/* ── スクロールコンテンツ ───────────────── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 目標 */}
            <Section title={t('howto_objective_title')}>
              <Text style={styles.desc}>{t('howto_objective_desc')}</Text>
            </Section>

            <View style={styles.divider} />

            {/* 基本の流れ */}
            <Section title={t('howto_play_title')}>
              <Text style={styles.step}>{t('howto_play_step1')}</Text>
              <Text style={styles.step}>{t('howto_play_step2')}</Text>
              <Text style={styles.step}>{t('howto_play_step3')}</Text>
            </Section>

            <View style={styles.divider} />

            {/* 影響力 */}
            <Section title={t('howto_influence_title')}>
              <Text style={styles.desc}>{t('howto_influence_desc')}</Text>
            </Section>

            <View style={styles.divider} />

            {/* シェイプ種類 */}
            <Section title={t('howto_shapes_title')}>
              <Text style={styles.desc}>{t('howto_shapes_desc')}</Text>
            </Section>

            <View style={styles.divider} />

            {/* ヒント */}
            <Section title={t('howto_tip_title')}>
              <Text style={styles.tip}>{t('howto_tip_desc')}</Text>
            </Section>
          </ScrollView>

          {/* ── 閉じるボタン ──────────────────────── */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>{t('howto_close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

HowToPlayOverlay.displayName = 'HowToPlayOverlay';

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    width: '100%',
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  tip: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  closeBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
