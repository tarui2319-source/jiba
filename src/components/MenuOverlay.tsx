/**
 * JIBA — MenuOverlay コンポーネント
 * 設定メニュー + スワイプ式チュートリアルを1つのModalで管理。
 *
 * 構造:
 *   Modal
 *   └── View (card)
 *       ├── [メニューモード] リスト3項目（ルール説明/名前変更/言語設定）
 *       └── [チュートリアルモード] 5枚スライド（図解 + スワイプ/ナビ）
 *
 * - 入れ子Modal不使用（iOS互換）
 * - イラストはRN Viewによるミニボード描画（外部アセット不要）
 * - PanResponder でスワイプジェスチャー対応
 */

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  PanResponder,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius, MIN_TAP } from '../constants/theme';
import { useI18n, Locale } from '../i18n';
import { I18nKey } from '../i18n/ja';

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────

export interface MenuOverlayProps {
  visible: boolean;
  onClose: () => void;
  onEditUsername: () => void;
}

// ──────────────────────────────────────────────────────────────
// ミニボード描画ユーティリティ
// ──────────────────────────────────────────────────────────────

type CellColor = 'empty' | 'blue' | 'red' | 'selected' | 'influence' | 'influence_strong';

const CELL_BG: Record<CellColor, string> = {
  empty:            Colors.bg,
  blue:             Colors.blue,
  red:              Colors.red,
  selected:         Colors.bg,
  influence:        'rgba(79,142,247,0.28)',
  influence_strong: 'rgba(79,142,247,0.52)',
};

interface MiniBoardProps {
  board: CellColor[][];
  cellSize: number;
}

const MiniBoard = memo<MiniBoardProps>(({ board, cellSize }) => (
  <View>
    {board.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row' }}>
        {row.map((cell, ci) => (
          <View
            key={ci}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: CELL_BG[cell],
              borderWidth: cell === 'selected' ? 2 : 0.5,
              borderColor: cell === 'selected' ? Colors.selectedBorder : Colors.borderSubtle,
            }}
          />
        ))}
      </View>
    ))}
  </View>
));
MiniBoard.displayName = 'MiniBoard';

// ──────────────────────────────────────────────────────────────
// イラスト 1 — 目標
// ──────────────────────────────────────────────────────────────

const OBJ_BOARD: CellColor[][] = [
  ['blue', 'blue', 'blue', 'red',   'empty'],
  ['blue', 'blue', 'red',  'empty', 'empty'],
  ['blue', 'empty','empty','empty', 'empty'],
  ['blue', 'empty','empty','empty', 'empty'],
  ['empty','empty','empty','empty', 'empty'],
];

const ObjectiveIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoard board={OBJ_BOARD} cellSize={28} />
    <View style={illS.scoreRow}>
      <Text style={illS.blueScore}>BLUE 7</Text>
      <Text style={illS.vs}>vs</Text>
      <Text style={illS.redScore}>RED 3</Text>
    </View>
    <View style={illS.winBadge}>
      <Text style={illS.winText}>BLUE WIN! 🎉</Text>
    </View>
  </View>
));
ObjectiveIll.displayName = 'ObjectiveIll';

// ──────────────────────────────────────────────────────────────
// イラスト 2 — マスを選ぶ
// ──────────────────────────────────────────────────────────────

const SEL_BOARD: CellColor[][] = [
  ['empty', 'empty',    'empty', 'empty'],
  ['empty', 'selected', 'empty', 'empty'],
  ['empty', 'empty',    'empty', 'empty'],
  ['empty', 'empty',    'empty', 'empty'],
];

const SelectSquareIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoard board={SEL_BOARD} cellSize={32} />
    <Text style={illS.tapHint}>👆 タップ!</Text>
  </View>
));
SelectSquareIll.displayName = 'SelectSquareIll';

// ──────────────────────────────────────────────────────────────
// イラスト 3 — シェイプを選ぶ
// ──────────────────────────────────────────────────────────────

const SHAPES: { name: string; cells: (0 | 1)[][] }[] = [
  { name: 'WEAK',  cells: [[0,0,0],[0,1,0],[0,0,0]] },
  { name: 'LINE',  cells: [[0,1,0],[0,1,0],[0,1,0]] },
  { name: 'ELBOW', cells: [[0,1,0],[0,1,0],[0,1,1]] },
  { name: 'T',     cells: [[0,1,0],[1,1,1],[0,0,0]] },
  { name: 'SQ',    cells: [[1,1,0],[1,1,0],[0,0,0]] },
  { name: 'CROSS', cells: [[0,1,0],[1,1,1],[0,1,0]] },
];
const ACTIVE_IDX = 3; // T字をハイライト

const ShapePixel = memo<{ cells: (0 | 1)[][]; active: boolean }>(({ cells, active }) => {
  const C = 9;
  return (
    <View>
      {cells.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((px, ci) => (
            <View
              key={ci}
              style={{
                width: C, height: C,
                backgroundColor: px === 1
                  ? (active ? Colors.blue : Colors.neutral)
                  : 'transparent',
                borderRadius: 1,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});
ShapePixel.displayName = 'ShapePixel';

const SelectShapeIll = memo(() => (
  <View style={illS.wrap}>
    <View style={illS.waveBadge}>
      <Text style={illS.waveText}>WAVE</Text>
    </View>
    <View style={illS.shapesRow}>
      {SHAPES.map((s, i) => {
        const active = i === ACTIVE_IDX;
        return (
          <View key={s.name} style={[illS.shapeBox, active && illS.shapeBoxActive]}>
            <ShapePixel cells={s.cells} active={active} />
            <Text style={[illS.shapeName, active && illS.shapeNameActive]}>{s.name}</Text>
          </View>
        );
      })}
    </View>
  </View>
));
SelectShapeIll.displayName = 'SelectShapeIll';

// ──────────────────────────────────────────────────────────────
// イラスト 4 — 影響力を広げる
// ──────────────────────────────────────────────────────────────

const INF_BOARD: CellColor[][] = [
  ['empty',     'empty',     'empty',     'empty',     'empty'],
  ['empty',     'influence', 'influence', 'influence', 'empty'],
  ['empty',     'influence', 'blue',      'influence', 'empty'],
  ['empty',     'influence', 'influence', 'influence', 'empty'],
  ['empty',     'empty',     'empty',     'empty',     'empty'],
];

const InfluenceIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoard board={INF_BOARD} cellSize={26} />
    <View style={illS.legend}>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: Colors.blue }]} />
        <Text style={illS.legendLabel}>配置</Text>
      </View>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: CELL_BG.influence }]} />
        <Text style={illS.legendLabel}>影響力</Text>
      </View>
    </View>
  </View>
));
InfluenceIll.displayName = 'InfluenceIll';

// ──────────────────────────────────────────────────────────────
// イラスト 5 — スタック
// ──────────────────────────────────────────────────────────────

const STACK_BEFORE: CellColor[][] = [
  ['empty', 'empty', 'empty'],
  ['empty', 'blue',  'empty'],
  ['empty', 'empty', 'empty'],
];

const STACK_AFTER: CellColor[][] = [
  ['influence', 'influence',        'influence',        'influence',        'influence'],
  ['influence', 'influence_strong', 'influence_strong', 'influence_strong', 'influence'],
  ['influence', 'influence_strong', 'blue',             'influence_strong', 'influence'],
  ['influence', 'influence_strong', 'influence_strong', 'influence_strong', 'influence'],
  ['influence', 'influence',        'influence',        'influence',        'influence'],
];

const StackIll = memo(() => (
  <View style={illS.wrap}>
    <View style={illS.stackRow}>
      <View style={illS.stackGroup}>
        <Text style={illS.stackLabel}>× 1</Text>
        <MiniBoard board={STACK_BEFORE} cellSize={26} />
      </View>
      <Text style={illS.stackArrow}>→</Text>
      <View style={illS.stackGroup}>
        <Text style={[illS.stackLabel, illS.stackLabelHi]}>× 3 スタック!</Text>
        <MiniBoard board={STACK_AFTER} cellSize={20} />
      </View>
    </View>
  </View>
));
StackIll.displayName = 'StackIll';

// ──────────────────────────────────────────────────────────────
// イラスト共通スタイル
// ──────────────────────────────────────────────────────────────

const illS = StyleSheet.create({
  wrap:          { alignItems: 'center', gap: Spacing.sm },
  scoreRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  blueScore:     { color: Colors.blue, fontSize: FontSize.sm, fontWeight: '700' },
  vs:            { color: Colors.textMuted, fontSize: FontSize.xs },
  redScore:      { color: Colors.red, fontSize: FontSize.sm, fontWeight: '700' },
  winBadge:      {
    backgroundColor: Colors.blueTint,
    borderRadius: Radius.sm,
    paddingVertical: 3, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.blue,
  },
  winText:       { color: Colors.blue, fontSize: FontSize.sm, fontWeight: '800' },
  tapHint:       { color: Colors.selectedBorder, fontSize: FontSize.xs, fontWeight: '700' },
  waveBadge:     {
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  waveText:      { color: Colors.blue, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2 },
  shapesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center' },
  shapeBox:      {
    width: 52, alignItems: 'center', gap: 3,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bg,
  },
  shapeBoxActive: { backgroundColor: Colors.blueTint, borderColor: Colors.blue },
  shapeName:     { color: Colors.textMuted, fontSize: 8, fontWeight: '700' },
  shapeNameActive: { color: Colors.blue },
  legend:        { flexDirection: 'row', gap: Spacing.lg },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:     { width: 12, height: 12, borderRadius: 3 },
  legendLabel:   { color: Colors.textSecondary, fontSize: FontSize.xs },
  stackRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stackGroup:    { alignItems: 'center', gap: Spacing.xs },
  stackLabel:    { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  stackLabelHi:  { color: Colors.blue, fontWeight: '700' },
  stackArrow:    { color: Colors.textSecondary, fontSize: 20, fontWeight: '700' },
});

// ──────────────────────────────────────────────────────────────
// スライドデータ（コンポーネント + i18nキー）
// ──────────────────────────────────────────────────────────────

const ILLUSTRATIONS: React.ComponentType[] = [
  ObjectiveIll,
  SelectSquareIll,
  SelectShapeIll,
  InfluenceIll,
  StackIll,
];

const SLIDE_KEYS: Array<{ title: I18nKey; desc: I18nKey }> = [
  { title: 'tut_1_title', desc: 'tut_1_desc' },
  { title: 'tut_2_title', desc: 'tut_2_desc' },
  { title: 'tut_3_title', desc: 'tut_3_desc' },
  { title: 'tut_4_title', desc: 'tut_4_desc' },
  { title: 'tut_5_title', desc: 'tut_5_desc' },
];

const TOTAL_SLIDES = SLIDE_KEYS.length;

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────

export const MenuOverlay = memo<MenuOverlayProps>(({ visible, onClose, onEditUsername }) => {
  const { t, locale, setLocale } = useI18n();
  const [showTutorial, setShowTutorial] = useState(false);
  const [slide, setSlide] = useState(0);

  // 閉じた時にメニューリストへリセット
  useEffect(() => {
    if (!visible) {
      setShowTutorial(false);
      setSlide(0);
    }
  }, [visible]);

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
      <View style={s.backdrop}>
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
  cardTutorial: {
    paddingBottom: Spacing.xl,
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
  menuIcon: { fontSize: 20 },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
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
