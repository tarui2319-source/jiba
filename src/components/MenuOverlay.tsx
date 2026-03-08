/**
 * JIBA — MenuOverlay コンポーネント
 * 設定メニュー + スワイプ式チュートリアルを1つのModalで管理。
 *
 * 構造:
 *   Modal
 *   └── View (card)
 *       ├── [メニューモード] リスト3項目（ルール説明/名前変更/言語設定）
 *       └── [チュートリアルモード] 8枚スライド（図解 + スワイプ/ナビ）
 *
 * - 入れ子Modal不使用（iOS互換）
 * - イラストはRN Viewによるミニボード描画（外部アセット不要）
 * - PanResponder でスワイプジェスチャー対応
 *
 * イラスト/ミニボードは menu/ サブディレクトリで管理:
 *   menu/MiniBoard.tsx             — 描画プリミティブ
 *   menu/TutorialIllustrations.tsx — 8枚のイラスト + スライドデータ
 */

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  PanResponder,
  Alert,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius, MIN_TAP } from '../constants/theme';
import { useI18n, Locale } from '../i18n';
import { ILLUSTRATIONS, SLIDE_KEYS, TOTAL_SLIDES } from './menu/TutorialIllustrations';

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────

export interface MenuOverlayProps {
  visible: boolean;
  onClose: () => void;
  onEditUsername: () => void;
  /** true のとき、メニューが開いた瞬間にチュートリアルを自動表示する */
  startWithTutorial?: boolean;
  /** アカウント削除が確定したときに呼ばれるコールバック */
  onDeleteAccount?: () => void;
}

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────

export const MenuOverlay = memo<MenuOverlayProps>(({ visible, onClose, onEditUsername, startWithTutorial, onDeleteAccount }) => {
  const { t, locale, setLocale } = useI18n();
  const [showTutorial, setShowTutorial] = useState(false);
  const [slide, setSlide] = useState(0);

  // 表示状態変化でリセット／初回チュートリアル自動表示
  useEffect(() => {
    if (!visible) {
      setShowTutorial(false);
      setSlide(0);
    } else if (startWithTutorial) {
      setShowTutorial(true);
      setSlide(0);
    }
  }, [visible, startWithTutorial]);

  // ── スワイプジェスチャー ────────────────────────────────
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) setSlide(prev => Math.min(prev + 1, TOTAL_SLIDES - 1));
        if (g.dx >  40) setSlide(prev => Math.max(prev - 1, 0));
      },
    })
  ).current;

  const handleOpenTutorial = useCallback(() => {
    setSlide(0);
    setShowTutorial(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setShowTutorial(false);
    setSlide(0);
  }, []);

  const handleEditUsername = useCallback(() => {
    onClose();
    // UsernameModal は GameScreen 側で管理。メニューを閉じてから開く。
    setTimeout(() => onEditUsername(), 150);
  }, [onClose, onEditUsername]);

  const handleDeleteAccountPress = useCallback(() => {
    Alert.alert(
      t('delete_account_title'),
      t('delete_account_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_account_yes'),
          style: 'destructive',
          onPress: () => {
            onClose();
            onDeleteAccount?.();
          },
        },
      ],
    );
  }, [t, onClose, onDeleteAccount]);

  const IllComponent = ILLUSTRATIONS[slide];

  // ── メニューリスト ────────────────────────────────────
  const renderMenu = () => (
    <>
      <Text style={s.menuTitle}>{t('menu_title')}</Text>

      {/* ルール説明 */}
      <TouchableOpacity style={s.menuItem} onPress={handleOpenTutorial} activeOpacity={0.75}>
        <Text style={s.menuIcon}>📖</Text>
        <Text style={s.menuLabel}>{t('menu_rules')}</Text>
        <Text style={s.menuArrow}>›</Text>
      </TouchableOpacity>

      {/* 名前変更 */}
      <TouchableOpacity style={s.menuItem} onPress={handleEditUsername} activeOpacity={0.75}>
        <Text style={s.menuIcon}>✏️</Text>
        <Text style={s.menuLabel}>{t('menu_username_item')}</Text>
        <Text style={s.menuArrow}>›</Text>
      </TouchableOpacity>

      {/* 言語設定 */}
      <View style={[s.menuItem, s.menuItemLang]}>
        <Text style={s.menuIcon}>🌐</Text>
        <Text style={s.menuLabel}>{t('menu_language_item')}</Text>
        <View style={s.langToggle}>
          {(['ja', 'en'] as Locale[]).map(loc => (
            <TouchableOpacity
              key={loc}
              style={[s.langBtn, locale === loc && s.langBtnActive]}
              onPress={() => setLocale(loc)}
              activeOpacity={0.75}
            >
              <Text style={[s.langBtnText, locale === loc && s.langBtnTextActive]}>
                {loc === 'ja' ? '日本語' : 'English'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* アカウント削除 */}
      {onDeleteAccount != null && (
        <TouchableOpacity style={s.menuItemDanger} onPress={handleDeleteAccountPress} activeOpacity={0.75}>
          <Text style={s.menuIcon}>🗑</Text>
          <Text style={s.menuLabelDanger}>{t('menu_delete_account')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={s.closeBtnText}>{t('menu_close')}</Text>
      </TouchableOpacity>
    </>
  );

  // ── チュートリアル ────────────────────────────────────
  const renderTutorial = () => (
    <>
      {/* 戻るボタン */}
      <TouchableOpacity style={s.backBtn} onPress={handleBackToMenu} activeOpacity={0.75}>
        <Text style={s.backBtnText}>‹ {t('menu_back')}</Text>
      </TouchableOpacity>

      {/* スライドエリア（スワイプ対応） */}
      <View style={s.slideArea} {...pan.panHandlers}>
        <View style={s.illArea}>
          <IllComponent />
        </View>
        <Text style={s.slideTitle}>{t(SLIDE_KEYS[slide].title)}</Text>
        <Text style={s.slideDesc}>{t(SLIDE_KEYS[slide].desc)}</Text>
      </View>

      {/* ドットインジケーター */}
      <View style={s.dots}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSlide(i)}
            style={[s.dot, slide === i && s.dotActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        ))}
      </View>

      {/* 前へ / カウンター / 次へ */}
      <View style={s.navRow}>
        <TouchableOpacity
          style={[s.navBtn, slide === 0 && s.navBtnDisabled]}
          onPress={() => setSlide(prev => Math.max(prev - 1, 0))}
          disabled={slide === 0}
          activeOpacity={0.75}
        >
          <Text style={[s.navBtnText, slide === 0 && s.navBtnTextDim]}>
            ‹ {t('tut_prev')}
          </Text>
        </TouchableOpacity>

        <Text style={s.slideCount}>{slide + 1} / {TOTAL_SLIDES}</Text>

        {slide < TOTAL_SLIDES - 1 ? (
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setSlide(prev => Math.min(prev + 1, TOTAL_SLIDES - 1))}
            activeOpacity={0.75}
          >
            <Text style={s.navBtnText}>{t('tut_next')} ›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.navBtn, s.navBtnDone]}
            onPress={handleBackToMenu}
            activeOpacity={0.75}
          >
            <Text style={[s.navBtnText, s.navBtnDoneText]}>{t('tut_done')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={showTutorial ? handleBackToMenu : onClose}
    >
      <View style={[s.backdrop, showTutorial && s.backdropTutorial]}>
        <View style={[s.card, showTutorial && s.cardTutorial]}>
          {showTutorial ? renderTutorial() : renderMenu()}
        </View>
      </View>
    </Modal>
  );
});

MenuOverlay.displayName = 'MenuOverlay';

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  backdropTutorial: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  cardTutorial: {
    paddingBottom: Spacing.xl,
    borderRadius: Radius.xxl,
  },

  // ── メニュー ─────────────────────────────────────────
  menuTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: MIN_TAP,
  },
  menuItemLang: {
    flexWrap: 'wrap',
  },
  menuItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(240,82,82,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,82,82,0.3)',
    minHeight: MIN_TAP,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuLabelDanger: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.red,
  },
  menuArrow: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    fontWeight: '300',
    lineHeight: FontSize.xl + 2,
  },

  // 言語トグル
  langToggle: { flexDirection: 'row', gap: Spacing.xs },
  langBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  langBtnActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  langBtnText:   { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  langBtnTextActive: { color: Colors.white },

  // 閉じるボタン
  closeBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  closeBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },

  // ── チュートリアル ────────────────────────────────────
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  backBtnText: { color: Colors.blue, fontSize: FontSize.sm, fontWeight: '700' },

  slideArea: {
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 290,
    justifyContent: 'center',
  },
  illArea: {
    height: 168,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  slideTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },

  // ドット
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.blue,
  },

  // ナビゲーション
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceHigh,
    minWidth: 80,
    alignItems: 'center',
  },
  navBtnDone: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText:    { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  navBtnDoneText: { color: Colors.white },
  navBtnTextDim: { color: Colors.textMuted },
  slideCount:    { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
});
