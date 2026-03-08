/**
 * チュートリアルスライド用イラストコンポーネント群
 *
 * 8枚のスライドイラスト + スライドデータ定数を管理する。
 * MenuOverlay から import して使用する。
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { useI18n } from '../../i18n';
import { I18nKey } from '../../i18n/ja';
import { MiniBoard, MiniBoardLabeled, CELL_BG, CellColor } from './MiniBoard';

// ──────────────────────────────────────────────────────────────
// イラスト 1 — 目標
// ──────────────────────────────────────────────────────────────

const OBJ_BOARD: CellColor[][] = [
  ['first', 'first', 'first', 'second',  'empty'],
  ['first', 'first', 'second', 'empty', 'empty'],
  ['first', 'empty', 'empty', 'empty',  'empty'],
  ['first', 'empty', 'empty', 'empty',  'empty'],
  ['empty', 'empty', 'empty', 'empty',  'empty'],
];

export const ObjectiveIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoard board={OBJ_BOARD} cellSize={28} />
    <View style={illS.scoreRow}>
      <Text style={illS.blueScore}>先攻 7</Text>
      <Text style={illS.vs}>vs</Text>
      <Text style={illS.redScore}>後攻 3</Text>
    </View>
    <View style={illS.winBadge}>
      <Text style={illS.winText}>先攻の勝ち！ 🎉</Text>
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

export const SelectSquareIll = memo(() => (
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

export const SelectShapeIll = memo(() => (
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
  ['empty', 'influence', 'first',     'influence', 'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'empty',     'empty',     'empty',     'empty'],
];
const INF_LABELS: (string | null)[][] = [
  [null, null, null,  null, null],
  [null, null, '2',   null, null],
  [null, '2',  '⚓',  '2',  null],
  [null, null, '2',   null, null],
  [null, null, null,  null, null],
];

export const InfluenceIll = memo(() => {
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

const PLACE_BOARD: CellColor[][] = [
  ['first_sel', 'empty',     'empty',     'second',    'empty'],
  ['first_sel', 'first_sel', 'empty',     'empty',     'empty'],
  ['empty',     'first_sel', 'empty',     'first_sel', 'empty'],
  ['empty',     'empty',     'empty',     'first_sel', 'second'],
  ['empty',     'empty',     'second',    'empty',     'empty'],
];

export const PlacementIll = memo(() => (
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
  ['empty', 'influence', 'first',     'influence', 'empty'],
  ['empty', 'empty',     'influence', 'empty',     'empty'],
  ['empty', 'empty',     'empty',     'empty',     'empty'],
];
const SPREAD_LABELS: (string | null)[][] = [
  [null, null, null,  null, null],
  [null, null, '2',   null, null],
  [null, '2',  '⚓',  '2',  null],
  [null, null, '2',   null, null],
  [null, null, null,  null, null],
];

export const PowerSpreadIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoardLabeled board={SPREAD_BOARD} labels={SPREAD_LABELS} cellSize={18} />
  </View>
));
PowerSpreadIll.displayName = 'PowerSpreadIll';

// ──────────────────────────────────────────────────────────────
// イラスト 7 — 強いパワーが勝つ
// ──────────────────────────────────────────────────────────────

export const HigherPowerIll = memo(() => (
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
  ['second_inf', 'first',      'second_inf'],
  ['second_inf', 'second_inf', 'second_inf'],
];
const IMMUNE_LABELS: (string | null)[][] = [
  ['3', '3', '3'],
  ['3', '⚓', '3'],
  ['3', '3', '3'],
];

export const AnchorImmuneIll = memo(() => (
  <View style={illS.wrap}>
    <MiniBoardLabeled board={IMMUNE_BOARD} labels={IMMUNE_LABELS} cellSize={24} />
  </View>
));
AnchorImmuneIll.displayName = 'AnchorImmuneIll';

// ──────────────────────────────────────────────────────────────
// スライドデータ定数
// ──────────────────────────────────────────────────────────────

export const ILLUSTRATIONS: React.ComponentType[] = [
  ObjectiveIll,
  SelectSquareIll,
  SelectShapeIll,
  InfluenceIll,
  PlacementIll,
  PowerSpreadIll,
  HigherPowerIll,
  AnchorImmuneIll,
];

export const SLIDE_KEYS: Array<{ title: I18nKey; desc: I18nKey }> = [
  { title: 'tut_1_title', desc: 'tut_1_desc' },
  { title: 'tut_2_title', desc: 'tut_2_desc' },
  { title: 'tut_3_title', desc: 'tut_3_desc' },
  { title: 'tut_4_title', desc: 'tut_4_desc' },
  { title: 'tut_5_title', desc: 'tut_5_desc' },
  { title: 'tut_6_title', desc: 'tut_6_desc' },
  { title: 'tut_7_title', desc: 'tut_7_desc' },
  { title: 'tut_8_title', desc: 'tut_8_desc' },
];

export const TOTAL_SLIDES = SLIDE_KEYS.length; // 8

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

  // ── Slide 7: パワー比較 ──────────────────────────────────
  matchupRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchupBox:        { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  matchupNum:        { color: Colors.white, fontSize: 22, fontWeight: '900' },
  matchupVsText:     { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  matchupArrowText:  { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '700' },
  matchupCheckText:  { color: Colors.white, fontSize: 20, fontWeight: '900' },
});
