---
paths:
  - src/__tests__/**
---

# test-conventions

## テスト命名規則
```typescript
describe('モジュール名', () => {
  describe('関数/フック名', () => {
    test('正常系: <何を確認するか>', () => { ... });
    test('異常系: <エラー条件>', () => { ... });
    test('境界値: <極端な入力>', () => { ... });
  });
});
```

## 必須シナリオ
各関数・フック・サービスに最低3ケース:
1. **正常系**: 有効な入力・期待通りの出力
2. **異常系**: 無効入力・エラー状態・null返却
3. **境界値**: 空配列・最小/最大サイズ・ゼロ

## モック規則

### Supabase は必ずモック
```typescript
// ✅ 正しいモック
jest.mock('../../network/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }),
  },
  MY_PLAYER_ID: 'test-player-uuid',
}));
```

### renderHook は @testing-library/react を使用
```typescript
// ✅ 正しい
import { renderHook, act } from '@testing-library/react';

// ❌ 廃止済み
import { renderHook } from '@testing-library/react-hooks';  // 非推奨
```

## カバレッジ要件
- `src/engine/**` : 80%以上（グローバル threshold）
- `src/engine/index.ts` : 対象外（バレルエクスポートのみ）

## テストファイルでの unused vars
```typescript
// ❌ 未使用変数は作らない
const unusedResult = someFunction();  // ESLintエラー

// ✅ 戻り値が不要なら代入しない
someFunction();

// ✅ 型チェック用に必要な場合は _ prefix
const _forTypeCheck = someFunction();
```
