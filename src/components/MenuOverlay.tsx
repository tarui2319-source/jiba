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
  /** true のとき、メニューが開いた瞬間にチュートリアルを自動表示する */
  startWithTutorial?: boolean;
}

// ──────────────────────────────────────────────────────────────
// ミニボード描画ユーティリティ
// ──────────────────────────────────────────────────────────────

type CellColor =
  | 'empty'
  | 'first'
  | 'first_sel'        // blue + 黄色枠（設置可能マスを示す）
  | 'second'
  | 'selected'
  | 'influence'
  | 'influence_strong'
  | 'second_inf';        // SECOND の影響圏（半透明）

const CELL_BG: Record<CellColor, string> = {
  empty:            Colors.bg,
  first:             Colors.blue,
  first_sel:         Colors.blue,
  second:              Colors.red,
  selected:         Colors.bg,
  influence:        'rgba(79,142,247,0.28)',
  influence_strong: 'rgba(79,142,247,0.52)',
  second_inf:          'rgba(240,82,82,0.28)',
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
              borderWidth: (cell === 'selected' || cell === 'first_sel') ? 2 : 0.5,
              borderColor: (cell === 'selected' || cell === 'first_sel')
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
  ['first', 'first', 'first', 'second',   'empty'],
  ['first', 'first', 'second',  'empty', 'empty'],
  ['first', 'empty','empty','empty', 'empty'],
  ['first', 'empty','empty','empty', 'empty'],
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
// イラスト 3 — シェイプを選ぶ（実際の7種類）
// ──────────────────────────────────────────────────────────────

const makeOffsetSet = (pairs: [number, number][]): Set<string> =>
  new Set(pairs.map(([dr, dc]) => `${dr},${dc}`));

const ACTUAL_SHAPES_DATA = [
  { name: '弱',   offsets: makeOffsetSet([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]), power: 1 },
  { name: '十字', offsets: makeOffsetSet([[-1,0],[0,-1],[0,1],[1,0]]),                              power: 2 },
  { name: '斜め', offsets: makeOffsetSet([[-1,-1],[-1,1],[1,-1],[1,1]]),                            power: 2 },
  { name: '縦',   offsets: makeOffsetSet([[-1,0],[1,0]]),                                           power: 4 },
  { name: '横',   offsets: makeOffsetSet([[0,-1],[0,1]]),                                           power: 4 },
  { name: '↖↘', offsets: makeOffsetSet([[-1,-1],[1,1]]),                                           power: 4 },
  { name: '↗↙', offsets: makeOffsetSet([[-1,1],[1,-1]]),                                           power: 4 },
];

const SHAPE_C = 10;
const SHAPE_GAP = 1.5;
const ACTIVE_SHAPE_IDX = 1; // 十字をハイライト

const ShapeCard = memo<{ item: typeof ACTUAL_SHAPES_DATA[0]; active: boolean }>(
  ({ item, active }) => (
    <View style={[illS.shapeCard, active && illS.shapeCardActive]}>
      <View style={{ gap: SHAPE_GAP }}>
        {[0, 1, 2].map(r => (
          <View key={r} style={{ flexDirection: 'row', gap: SHAPE_GAP }}>
            {[0, 1, 2].map(c => {
              const isCenter   = r === 1 && c === 1;
              const isAffected = item.offsets.has(`${r - 1},${c - 1}`);
              return (
                <View
                  key={c}
                  style={{
                    width: SHAPE_C, height: SHAPE_C,
                    backgroundColor: isCenter
                      ? Colors.neutralText
                      : isAffected ? '#2a4a7a' : Colors.border,
                    borderRadius: 1.5,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Text style={[illS.shapeCardPow, active && illS.shapeCardPowActive]}>{item.power}</Text>
      <Text style={[illS.shapeCardName, active && illS.shapeCardNameActive]}>{item.name}</Text>
    </View>
  ),
);
ShapeCard.displayName = 'ShapeCard';

const SelectShapeIll = memo(() => (
  <View style={illS.wrap}>
    <View style={illS.waveBadge}>
      <Text style={illS.waveText}>WAVE</Text>
    </View>
    <View style={illS.shapesRow7}>
      {ACTUAL_SHAPES_DATA.map((item, i) => (
        <ShapeCard key={item.name} item={item} active={i === ACTIVE_SHAPE_IDX} />
      ))}
    </View>
  </View>
));
SelectShapeIll.displayName = 'SelectShapeIll';

// ──────────────────────────────────────────────────────────────
// イラスト 4 — パワーを広げる（mid_cross: アンカー⚓・パワー2）
// ──────────────────────────────────────────────────────────────

const INF_BOARD: CellColor[][] = [
  ['empty', 'empty',     'empty',     'empty',     'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'influence', 'first',      'influence', 'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'empty',     'empty',     'empty',     'empty'],
];

const INF_LABELS: (string | null)[][] = [
  [null, null, null, null, null],
  [null, null, '2',  null, null],
  [null, '2',  '⚓', '2',  null],
  [null, null, '2',  null, null],
  [null, null, null, null, null],
];

const InfluenceIll = memo(() => {
  const { locale } = useI18n();
  const anchorLeg = locale === 'ja'
    ? '⚓ アンカーマス（敵に攻められない）'
    : '⚓ Anchor (cannot be attacked)';
  const powerLeg = locale === 'ja' ? 'パワー 2' : 'Power: 2';
  return (
    <View style={illS.wrap}>
      <MiniBoardLabeled board={INF_BOARD} labels={INF_LABELS} cellSize={26} />
      <View style={illS.legend}>
        <View style={illS.legendItem}>
          <View style={[illS.legendDot, { backgroundColor: Colors.blue }]} />
          <Text style={illS.legendLabel}>{anchorLeg}</Text>
        </View>
        <View style={illS.legendItem}>
          <View style={[illS.legendDot, { backgroundColor: CELL_BG.influence }]} />
          <Text style={illS.legendLabel}>{powerLeg}</Text>
        </View>
      </View>
    </View>
  );
});
InfluenceIll.displayName = 'InfluenceIll';

// ──────────────────────────────────────────────────────────────
// イラスト 5 — アンカー設置ルール
// ──────────────────────────────────────────────────────────────

// blue_sel = 自分が支配しているマス（黄色枠で「置ける」を表現）
const PLACE_BOARD: CellColor[][] = [
  ['first_sel', 'empty',    'empty',    'second',      'empty'],
  ['first_sel', 'first_sel', 'empty',    'empty',    'empty'],
  ['empty',    'first_sel', 'empty',    'first_sel', 'empty'],
  ['empty',    'empty',    'empty',    'first_sel', 'second'],
  ['empty',    'empty',    'second',      'empty',    'empty'],
];

const PlacementIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoard board={PLACE_BOARD} cellSize={24} />
    <View style={illS.legend}>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: Colors.blue, borderWidth: 1.5, borderColor: Colors.selectedBorder }]} />
        <Text style={illS.legendLabel}>置ける（⚓ 自分のアンカーあり）</Text>
      </View>
      <View style={illS.legendItem}>
        <View style={[illS.legendDot, { backgroundColor: Colors.red }]} />
        <Text style={illS.legendLabel}>相手</Text>
      </View>
    </View>
  </View>
));
PlacementIll.displayName = 'PlacementIll';

// ──────────────────────────────────────────────────────────────
// イラスト 6 — パワーが広がる（mid_cross, 5×5）
// ──────────────────────────────────────────────────────────────

const SPREAD_BOARD: CellColor[][] = [
  ['empty', 'empty',     'empty',     'empty',     'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'influence', 'first',      'influence', 'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'empty',     'empty',     'empty',     'empty'],
];
const SPREAD_LABELS: (string | null)[][] = [
  [null, null, null, null, null],
  [null, null, '2',  null, null],
  [null, '2',  '⚓', '2',  null],
  [null, null, '2',  null, null],
  [null, null, null, null, null],
];

const PowerSpreadIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoardLabeled board={SPREAD_BOARD} labels={SPREAD_LABELS} cellSize={18} />
  </View>
));
PowerSpreadIll.displayName = 'PowerSpreadIll';

// ──────────────────────────────────────────────────────────────
// イラスト 7 — 強いパワーが勝つ
// ──────────────────────────────────────────────────────────────

const HigherPowerIll = memo(() => (
  <View style={illS.wrap}>
    <View style={illS.matchupRow}>
      <View style={[illS.matchupBox, { backgroundColor: Colors.blue }]}>
        <Text style={illS.matchupNum}>4</Text>
      </View>
      <Text style={illS.matchupVsText}>vs</Text>
      <View style={[illS.matchupBox, { backgroundColor: Colors.red }]}>
        <Text style={illS.matchupNum}>2</Text>
      </View>
      <Text style={illS.matchupArrowText}>→</Text>
      <View style={[illS.matchupBox, {
        backgroundColor: Colors.blue,
        borderWidth: 2,
        borderColor: Colors.selectedBorder,
      }]}>
        <Text style={illS.matchupCheckText}>✓</Text>
      </View>
    </View>
  </View>
));
HigherPowerIll.displayName = 'HigherPowerIll';

// ──────────────────────────────────────────────────────────────
// イラスト 8 — アンカーだけは別（REDパワー3に囲まれてもBLUEアンカーは守られる）
// ──────────────────────────────────────────────────────────────

const IMMUNE_BOARD: CellColor[][] = [
  ['second_inf', 'second_inf', 'second_inf'],
  ['second_inf', 'first',    'second_inf'],
  ['second_inf', 'second_inf', 'second_inf'],
];
const IMMUNE_LABELS: (string | null)[][] = [
  ['3', '3', '3'],
  ['3', '⚓', '3'],
  ['3', '3', '3'],
];

const AnchorImmuneIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoardLabeled board={IMMUNE_BOARD} labels={IMMUNE_LABELS} cellSize={24} />
  </View>
));
AnchorImmuneIll.displayName = 'AnchorImmuneIll';

// ──────────────────────────────────────────────────────────────
// イラスト共通スタイル
// ──────────────────────────────────────────────────────────────

const illS = StyleSheet.create({
  wrap:      { alignItems: 'center', gap: Spacing.sm },
  scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  blueScore: { color: Colors.blue, fontSize: FontSize.sm, fontWeight: '700' },
  vs:        { color: Colors.textMuted, fontSize: FontSize.xs },
  redScore:  { color: Colors.red, fontSize: FontSize.sm, fontWeight: '700' },
  winBadge:  {
    backgroundColor: Colors.blueTint,
    borderRadius: Radius.sm,
    paddingVertical: 3, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.blue,
  },
  winText:   { color: Colors.blue, fontSize: FontSize.sm, fontWeight: '800' },
  tapHint:   { color: Colors.selectedBorder, fontSize: FontSize.xs, fontWeight: '700' },
  waveBadge: {
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  waveText:  { color: Colors.blue, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2 },
  legend:    { flexDirection: 'row', gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot:  { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },

  // ── Slide 3: シェイプ選択 ──────────────────────────────────
  shapesRow7:          { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  shapeCard:           {
    alignItems: 'center', gap: 3,
    paddingVertical: 4, paddingHorizontal: 2,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bg,
    width: 38,
  },
  shapeCardActive:     { backgroundColor: Colors.blueDim, borderColor: Colors.blue },
  shapeCardPow:        { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  shapeCardPowActive:  { color: Colors.blueLight },
  shapeCardName:       { color: Colors.textMuted, fontSize: 8 },
  shapeCardNameActive: { color: Colors.blue },

  // ── Slide 7: パワー比較 ───────────────────────────────────────
  matchupRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchupBox:        { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  matchupNum:        { color: Colors.white, fontSize: 22, fontWeight: '900' },
  matchupVsText:     { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  matchupArrowText:  { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '700' },
  matchupCheckText:  { color: Colors.white, fontSize: 20, fontWeight: '900' },
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
  PowerSpreadIll,
  HigherPowerIll,
  AnchorImmuneIll,
];

const SLIDE_KEYS: Array<{ title: I18nKey; desc: I18nKey }> = [
  { title: 'tut_1_title', desc: 'tut_1_desc' },
  { title: 'tut_2_title', desc: 'tut_2_desc' },
  { title: 'tut_3_title', desc: 'tut_3_desc' },
  { title: 'tut_4_title', desc: 'tut_4_desc' },
  { title: 'tut_5_title', desc: 'tut_5_desc' },
  { title: 'tut_6_title', desc: 'tut_6_desc' },
  { title: 'tut_7_title', desc: 'tut_7_desc' },
  { title: 'tut_8_title', desc: 'tut_8_desc' },
];

const TOTAL_SLIDES = SLIDE_KEYS.length; // 6

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────

export const MenuOverlay = memo<MenuOverlayProps>(({ visible, onClose, onEditUsername, startWithTutorial }) => {
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
