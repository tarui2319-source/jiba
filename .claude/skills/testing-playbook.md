# testing-playbook

JIBAのテスト方針・手順・シナリオテンプレート。

## テスト構成
```
src/__tests__/
├── engine/     純粋関数テスト（最重要・80%カバレッジ必須）
├── cpu/        CPUアルゴリズムテスト
├── hooks/      カスタムフックテスト（@testing-library/react）
└── network/    ネットワーク層テスト（Supabaseモック必須）
```

## エンジンテストの書き方
```typescript
import { computeInfluence } from '../../engine/influence';
import { createEmptyBoard } from '../helpers'; // テスト用ヘルパー

describe('computeInfluence', () => {
  test('正常系: アンカーなしの空ボード', () => {
    const board = createEmptyBoard(6);
    const result = computeInfluence(board, 6);
    // 全セルがニュートラルであること
    result.forEach(row => row.forEach(cell => {
      expect(cell.controller).toBe('neutral');
    }));
  });

  test('異常系: 境界外アンカー', () => {
    // エラーをスローするか、境界外を無視するか
  });

  test('境界値: 1x1ボード', () => {
    // 最小サイズ
  });
});
```

## ネットワーク層テストのモック方法
```typescript
// Supabaseクライアントをモック
jest.mock('../../network/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }),
  },
  MY_PLAYER_ID: 'test-uuid',
}));
```

## 各テストに含めるシナリオ（最低3ケース）
1. **正常系**: 期待通りの入力・期待通りの出力
2. **異常系**: 無効入力・エラー状態
3. **境界値**: 最小/最大/エッジケース

## カバレッジ確認
```bash
npm test -- --coverage
# src/engine/ のline coverage が80%以上であること
# coverage/lcov-report/index.html で視覚的に確認可能
```

## テスト追加時のチェックリスト
- [ ] 純粋関数は副作用なしで書く
- [ ] Supabase直呼び出しは必ずモック
- [ ] renderHookは@testing-library/reactのものを使う（react-hooks非推奨）
- [ ] asyncテストはawait/resolves/rejectsを使う
- [ ] 各テストは独立（beforeEachでリセット）
