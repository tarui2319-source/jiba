---
paths:
  - src/components/**
  - src/screens/**
---

# component-patterns

## 命名規則
- コンポーネント: `PascalCase` (例: `ShapeSelector`, `ScoreBar`)
- ファイル名: コンポーネント名と一致 (例: `ShapeSelector.tsx`)
- props interface: `コンポーネント名 + Props` (例: `ShapeSelectorProps`)
- StyleSheet: `s` または `styles` (例: `const s = StyleSheet.create({...})`)

## 必須パターン
```typescript
// ✅ 標準コンポーネント構造
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useI18n } from '../i18n';

interface MyComponentProps {
  value: string;       // 必須props
  onPress?: () => void; // オプションprops
}

// React.memo で最適化（UI再レンダリング削減）
export const MyComponent = React.memo<MyComponentProps>(({ value, onPress }) => {
  const { t } = useI18n();  // 多言語対応必須
  return (
    <View style={s.container}>
      {/* ... */}
    </View>
  );
});

// StyleSheet は末尾にまとめる
const s = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
});
```

## テーマトークン使用（直接値禁止）
```typescript
// ✅ テーマトークンを使う
color: Colors.text
padding: Spacing.md
borderRadius: Radius.md
fontSize: FontSize.md

// ❌ 直接値は使わない
color: '#FFFFFF'
padding: 12
```

## i18n 対応（必須）
```typescript
// ✅ 全表示テキストはi18n経由
const { t } = useI18n();
<Text>{t('game.someKey')}</Text>

// ❌ ハードコードした日本語/英語禁止
<Text>ゲームオーバー</Text>
```

## Animated.Value パターン（React Native）
```typescript
// useRef().current パターンはeslint-disableコメント必須
// eslint-disable-next-line react-hooks/refs
const fadeAnim = useRef(new Animated.Value(0)).current;
```

## ゲームカラー（Player対応）
```typescript
// first/second どちらのプレイヤーかで色を決定
const color = player === 'first' ? Colors.blue : Colors.red;
// ❌ 'blue'/'red' 文字列でのプレイヤー比較禁止
```
