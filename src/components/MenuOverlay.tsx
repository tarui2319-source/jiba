/**
 * JIBA — MenuOverlay コンポーネント
 * 設定メニュー + スワイプ式チュートリアルを1つのModalで管理。
 *
 * 構造:
 *   Modal
 *   └── View (card)
 *       ├── [メニューモード] リスト3項目（ルール説明/名前変更/言語設定）
 *       └── [チュートリアルモード] 6枚スライド（図解 + スワイプ/ナビ）
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

type CellColor =
  | 'empty'
  | 'blue'
  | 'blue_sel'        // blue + 黄色枠（設置可能マスを示す）
  | 'red'
  | 'selected'
  | 'influence'
  | 'influence_strong';

const CELL_BG: Record<CellColor, string> = {
  empty:            Colors.bg,
  blue:             Colors.blue,
  blue_sel:         Colors.blue,
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
              borderWidth: (cell === 'selected' || cell === 'blue_sel') ? 2 : 0.5,
              borderColor: (cell === 'selected' || cell === 'blue_sel')
                ? Colors.selectedBorder
                : Colors.borderSubtle,
            }}
          />
        ))}
      </View>
    ))}
  </View>
));
MiniBoard.displayName = 'MiniBoard';

// ── ラベル付きミニボード（数値オーバーレイ付き）─────────────

interface MiniBoardLabeledProps {
  board: CellColor[][];
  labels: (string | null)[][];
  cellSize: number;
}

const MiniBoardLabeled = memo<MiniBoardLabeledProps>(({ board, labels, cellSize }) => (
  <View>
    {board.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row' }}>
        {row.map((cell, ci) => {
          const label = labels[ri]?.[ci] ?? null;
          return (
            <View
              key={ci}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: CELL_BG[cell],
                borderWidth: 0.5,
                borderColor: Colors.borderSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {label != null && (
                <Text
                  style={{
                    fontSize: Math.round(cellSize * 0.44),
                    fontWeight: '900',
                    color: Colors.white,
                    lineHeight: Math.round(cellSize * 0.5),
                  }}
                >
                  {label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    ))}
  </View>
));
MiniBoardLabeled.displayName = 'MiniBoardLabeled';

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
// イラスト 3 — シェイプを選ぶ（セルサイズ 14px）
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
  const C = 14; // セルサイズ（旧: 9px）
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
                borderRadius: 2,
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
// イラスト 4 — パワーを広げる（数値ラベル付き）
// ──────────────────────────────────────────────────────────────

const INF_BOARD: CellColor[][] = [
  ['empty',     'empty',     'empty',     'empty',     'empty'],
  ['empty',     'influence', 'influence', 'influence', 'empty'],
  ['empty',     'influence', 'blue',      'influence', 'empty'],
  ['empty',     'influence', 'influence', 'influence', 'empty'],
  ['empty',     'empty',     'empty',     'empty',     'empty'],
];

const INF_LABELS: (string | null)[][] = [
  [null, null, null, null, null],
  [null, '1',  '1',  '1',  null],
  [null, '1',  '3',  '1',  null],
  [null, '1',  '1',  '1',  null],
  [null, null, null, null, null],
];

const InfluenceIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoardLabeled board={INF_BOARD} labels={INF_LABELS} cellSize={26} />
    <View style={illS.legend}>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: Colors.blue }]} />
        <Text style={illS.legendLabel}>配置 (パワー3)</Text>
      </View>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: CELL_BG.influence }]} />
        <Text style={illS.legendLabel}>パワー1</Text>
      </View>
    </View>
  </View>
));
InfluenceIll.displayName = 'InfluenceIll';

// ──────────────────────────────────────────────────────────────
// イラスト 5 — 設置ルール（どこでも + スタック）
// ──────────────────────────────────────────────────────────────

// blue_sel = 自分が支配しているマス（黄色枠で「置ける」を表現）
const PLACE_BOARD: CellColor[][] = [
  ['blue_sel', 'empty',    'empty',    'red',      'empty'],
  ['blue_sel', 'blue_sel', 'empty',    'empty',    'empty'],
  ['empty',    'blue_sel', 'empty',    'blue_sel', 'empty'],
  ['empty',    'empty',    'empty',    'blue_sel', 'red'],
  ['empty',    'empty',    'red',      'empty',    'empty'],
];

const STACK_BEFORE: CellColor[][] = [
  ['empty', 'empty', 'empty'],
  ['empty', 'blue',  'empty'],
  ['empty', 'empty', 'empty'],
];

const STACK_AFTER: CellColor[][] = [
  ['influence', 'influence_strong', 'influence'],
  ['influence_strong', 'blue', 'influence_strong'],
  ['influence', 'influence_strong', 'influence'],
];

const PlacementIll = memo(() => (
  <View style={illS.wrap}>
    <View style={illS.placeLayout}>
      {/* 左: 設置可能マスを示すボード */}
      <View style={illS.placeLeft}>
        <MiniBoard board={PLACE_BOARD} cellSize={22} />
        <View style={illS.placeLegend}>
          <View style={illS.legendItem}>
            <View style={[illS.legendDot, { backgroundColor: Colors.blue, borderWidth: 1.5, borderColor: Colors.selectedBorder }]} />
            <Text style={illS.legendLabel}>置ける</Text>
          </View>
          <View style={illS.legendItem}>
            <View style={[illS.legendDot, { backgroundColor: Colors.red }]} />
            <Text style={illS.legendLabel}>相手</Text>
          </View>
        </View>
      </View>
      {/* 右: スタック比較 */}
      <View style={illS.placeRight}>
        <Text style={illS.stackCompactTitle}>スタック</Text>
        <View style={illS.stackCompactRow}>
          <View style={illS.stackCompactItem}>
            <Text style={illS.stackLabel}>× 1</Text>
            <MiniBoard board={STACK_BEFORE} cellSize={20} />
          </View>
          <Text style={illS.stackArrow}>→</Text>
          <View style={illS.stackCompactItem}>
            <Text style={[illS.stackLabel, illS.stackLabelHi]}>× 2</Text>
            <MiniBoard board={STACK_AFTER} cellSize={20} />
          </View>
        </View>
      </View>
    </View>
  </View>
));
PlacementIll.displayName = 'PlacementIll';

// ──────────────────────────────────────────────────────────────
// イラスト 6 — ターン交代とパワー計算（3パターン）
// ──────────────────────────────────────────────────────────────

const TurnIll = memo(() => (
  <View style={illS.wrap}>
    {/* ターン交代シーケンス */}
    <View style={illS.turnSeq}>
      <View style={illS.turnStep}>
        <Text style={illS.turnStepLabel}>あなた</Text>
        <View style={[illS.turnBadge, illS.turnBadgeBlue]}>
          <Text style={illS.turnBadgeText}>BLUE</Text>
        </View>
      </View>
      <Text style={illS.turnArrow}>→</Text>
      <View style={illS.turnStep}>
        <Text style={illS.turnStepLabel}>相手</Text>
        <View style={[illS.turnBadge, illS.turnBadgeRed]}>
          <Text style={illS.turnBadgeText}>RED</Text>
        </View>
      </View>
      <Text style={illS.turnArrow}>→</Text>
      <View style={illS.turnStep}>
        <Text style={illS.turnStepLabel}>判定</Text>
        <View style={illS.turnBadge}>
          <Text style={illS.turnCalcText}>⚡</Text>
        </View>
      </View>
    </View>
    {/* 3パターン */}
    <View style={illS.patternsRow}>
      {/* BLUEが勝つ */}
      <View style={illS.pattern}>
        <View style={illS.powerRow}>
          <Text style={[illS.powerNum, illS.powerBlue]}>3</Text>
          <Text style={illS.powerVs}>vs</Text>
          <Text style={[illS.powerNum, illS.powerRed]}>1</Text>
        </View>
        <View style={[illS.patternResult, { backgroundColor: Colors.blue }]}>
          <Text style={illS.patternResultText}>BLUE</Text>
        </View>
      </View>
      {/* REDが勝つ */}
      <View style={illS.pattern}>
        <View style={illS.powerRow}>
          <Text style={[illS.powerNum, illS.powerBlue]}>1</Text>
          <Text style={illS.powerVs}>vs</Text>
          <Text style={[illS.powerNum, illS.powerRed]}>3</Text>
        </View>
        <View style={[illS.patternResult, { backgroundColor: Colors.red }]}>
          <Text style={illS.patternResultText}>RED</Text>
        </View>
      </View>
      {/* 引き分け（中立） */}
      <View style={illS.pattern}>
        <View style={illS.powerRow}>
          <Text style={[illS.powerNum, illS.powerBlue]}>2</Text>
          <Text style={illS.powerVs}>vs</Text>
          <Text style={[illS.powerNum, illS.powerRed]}>2</Text>
        </View>
        <View style={[illS.patternResult, illS.patternResultNeutral]}>
          <Text style={illS.patternResultNeutralText}>中立</Text>
        </View>
      </View>
    </View>
  </View>
));
TurnIll.displayName = 'TurnIll';

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
    width: 64, alignItems: 'center', gap: 4,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bg,
  },
  shapeBoxActive: { backgroundColor: Colors.blueTint, borderColor: Colors.blue },
  shapeName:     { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  shapeNameActive: { color: Colors.blue },
  legend:        { flexDirection: 'row', gap: Spacing.lg },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:     { width: 12, height: 12, borderRadius: 3 },
  legendLabel:   { color: Colors.textSecondary, fontSize: FontSize.xs },

  // ── Slide 5: 設置ルール ──────────────────────────────────
  placeLayout:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  placeLeft:         { alignItems: 'center', gap: Spacing.xs },
  placeLegend:       { flexDirection: 'row', gap: Spacing.md },
  placeRight:        { alignItems: 'center', gap: Spacing.xs },
  stackCompactTitle: { color: Colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  stackCompactRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stackCompactItem:  { alignItems: 'center', gap: 3 },
  stackLabel:    { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  stackLabelHi:  { color: Colors.blue, fontWeight: '700' },
  stackArrow:    { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  // ── Slide 6: ターン交代 ──────────────────────────────────
  turnSeq:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  turnStep:          { alignItems: 'center', gap: 3 },
  turnStepLabel:     { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },
  turnBadge:         {
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1, borderColor: Colors.border,
  },
  turnBadgeBlue:     { backgroundColor: Colors.blue, borderColor: Colors.blue },
  turnBadgeRed:      { backgroundColor: Colors.red, borderColor: Colors.red },
  turnBadgeText:     { color: Colors.white, fontSize: 11, fontWeight: '800' },
  turnCalcText:      { fontSize: 14 },
  turnArrow:         { color: Colors.textMuted, fontSize: 16, fontWeight: '700' },
  patternsRow:       { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  pattern:           { alignItems: 'center', gap: Spacing.xs },
  powerRow:          { flexDirection: 'row', alignItems: 'center', gap: 3 },
  powerNum:          { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  powerBlue:         { color: Colors.blue },
  powerRed:          { color: Colors.red },
  powerVs:           { fontSize: FontSize.xs, color: Colors.textMuted },
  patternResult:     { borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Spacing.md, minWidth: 50, alignItems: 'center' },
  patternResultText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  patternResultNeutral: {
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
  },
  patternResultNeutralText: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' },
});

// ──────────────────────────────────────────────────────────────
// スライドデータ（コンポーネント + i18nキー）
// ──────────────────────────────────────────────────────────────

const ILLUSTRATIONS: React.ComponentType[] = [
  ObjectiveIll,
  SelectSquareIll,
  SelectShapeIll,
  InfluenceIll,
  PlacementIll,
  TurnIll,
];

const SLIDE_KEYS: Array<{ title: I18nKey; desc: I18nKey }> = [
  { title: 'tut_1_title', desc: 'tut_1_desc' },
  { title: 'tut_2_title', desc: 'tut_2_desc' },
  { title: 'tut_3_title', desc: 'tut_3_desc' },
  { title: 'tut_4_title', desc: 'tut_4_desc' },
  { title: 'tut_5_title', desc: 'tut_5_desc' },
  { title: 'tut_6_title', desc: 'tut_6_desc' },
];

const TOTAL_SLIDES = SLIDE_KEYS.length; // 6

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
