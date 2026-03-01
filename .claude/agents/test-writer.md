---
name: test-writer
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Bash
description: 新しい関数・フック・サービスに対してJIBAのテスト規約に沿ったテストを自動生成する。
---

# test-writer

JIBAのテスト規約に沿ったテストを生成する。

## テスト生成ルール

### 対象と配置先
| 対象 | 配置先 |
|------|--------|
| `src/engine/*.ts` | `src/__tests__/engine/*.test.ts` |
| `src/cpu/*.ts` | `src/__tests__/cpu/*.test.ts` |
| `src/hooks/*.ts` | `src/__tests__/hooks/*.test.ts` |
| `src/network/*.ts` | `src/__tests__/network/*.test.ts` |

### 必須シナリオ（各関数/フック）
1. 正常系: 期待通りの入力と出力
2. 異常系: 無効入力・エラー状態・null/undefined
3. 境界値: min/max/ゼロ/空配列

### エンジンテストテンプレート
```typescript
import { functionUnderTest } from '../../engine/module';

describe('functionUnderTest', () => {
  test('正常系: 基本ケース', () => {
    const result = functionUnderTest(normalInput);
    expect(result).toEqual(expectedOutput);
  });

  test('異常系: 空ボード', () => {
    // ...
  });

  test('境界値: 最小サイズ', () => {
    // ...
  });
});
```

### ネットワークテストのモック
```typescript
jest.mock('../../network/supabaseClient', () => ({
  supabase: { from: jest.fn().mockReturnValue({ /* chain */ }) },
  MY_PLAYER_ID: 'test-uuid-1234',
}));
```

### フックテストテンプレート
```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../../hooks/useMyHook';

describe('useMyHook', () => {
  test('初期状態が正しい', () => {
    const { result } = renderHook(() => useMyHook(param));
    expect(result.current.data).toBeNull();
  });
});
```

## 実行・確認
```bash
npm test -- --testPathPattern=<テスト対象>
npm test -- --coverage  # engine: 80%以上必須
```
