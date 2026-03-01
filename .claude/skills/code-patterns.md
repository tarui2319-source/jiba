# code-patterns

JIBAプロジェクト固有のコードパターン集。新規コード作成時に参照。

## エンジン関数（純粋関数）
```typescript
// src/engine/影響力計算パターン
// 副作用なし・React/Supabase import禁止
import { Board, Player, CellState } from './types';

export function myPureFunction(board: Board, player: Player): CellState[][] {
  // 必ずimmutableに新しい配列を返す
  return board.map(row => row.map(cell => ({ ...cell })));
}
```

## ネットワーク層（Supabase操作）
```typescript
// src/network/ 以下のみ @supabase/supabase-js を import 可
import { supabase, MY_PLAYER_ID } from './supabaseClient';
import { RatingRow } from './networkTypes';

export async function fetchSomething(id: string): Promise<RatingRow | null> {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}
```

## カスタムフック
```typescript
// src/hooks/ 以下
// - ネットワーク操作は src/network/ を経由
// - ゲームロジックは src/engine/ を経由
import { useState, useEffect, useCallback } from 'react';
import { fetchSomething } from '../network/someService';

export function useMyHook(param: string) {
  const [data, setData] = useState<null | MyType>(null);

  useEffect(() => {
    let cancelled = false; // クリーンアップパターン必須
    fetchSomething(param).then(result => {
      if (!cancelled) setData(result);
    });
    return () => { cancelled = true; };
  }, [param]);

  return { data };
}
```

## コンポーネント
```typescript
// src/components/ 以下
// React.memoで最適化、propsはinterface定義必須
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useI18n } from '../i18n';

interface MyComponentProps {
  value: string;
  onPress: () => void;
}

export const MyComponent = React.memo<MyComponentProps>(({ value, onPress }) => {
  const { t } = useI18n();
  return (
    <View style={s.container}>
      <Text style={s.text}>{t('someKey')}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  container: { padding: Spacing.md },
  text: { color: Colors.text },
});
```

## Animated.Value パターン（React Native）
```typescript
// useRef().current で取り出すパターン（RN標準）
// eslint-disable-next-line react-hooks/refs
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, [fadeAnim]);
```

## i18n テキスト
```typescript
// src/i18n/ja.ts と en.ts に両方追加してから useI18n().t() を使う
const { t } = useI18n();
<Text>{t('game.myNewKey')}</Text>

// ja.ts / en.ts に追加:
// game: { myNewKey: '日本語テキスト' }
```

## Player識別子（必ずfirst/second）
```typescript
// ✅ 正しい
player: 'first' | 'second'
winner: 'first' | 'second' | 'draw'

// ❌ 廃止済み（使用禁止）
player: 'blue' | 'red'
```

## ShapeKind（7種類固定・変更禁止）
```typescript
type ShapeKind =
  | 'weak'
  | 'mid_cross'
  | 'mid_diag'
  | 'strong_vert'
  | 'strong_horiz'
  | 'strong_diag_nwse'
  | 'strong_diag_nesw';
```
