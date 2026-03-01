---
paths:
  - src/network/**
  - src/hooks/**
  - src/engine/**
  - src/components/**
  - src/screens/**
  - src/cpu/**
---

# network-isolation

## ルール（違反は即Stop & Ask）

### 1. Supabase import は src/network/ のみ
```
✅ src/network/supabaseClient.ts  → @supabase/supabase-js を import 可
✅ src/network/roomService.ts     → supabaseClient から import 可
✅ src/network/moveService.ts     → supabaseClient から import 可
✅ src/network/ratingService.ts   → supabaseClient から import 可

❌ src/hooks/*.ts      → @supabase/supabase-js 直接 import 禁止
❌ src/engine/*.ts     → 外部ライブラリ import 禁止（純粋関数のみ）
❌ src/components/*.ts → @supabase/supabase-js 直接 import 禁止
```

### 2. fetch/curl/XMLHttpRequest 禁止
```
❌ fetch('https://...')       → 絶対禁止
❌ axios.get(...)             → 絶対禁止
❌ XMLHttpRequest             → 絶対禁止
```

### 3. エンジンの純粋関数性を守る
```
src/engine/ 以下のファイルは:
✅ 純粋関数のみ（同じ入力 → 必ず同じ出力）
✅ React / Supabase / AsyncStorage import 禁止
✅ Math.random() 禁止（src/engine/randomMove.ts は例外）
```

### 4. Player識別子
```
✅ 'first' | 'second' | 'draw'  → 現在の仕様
❌ 'blue' | 'red'              → 廃止済み・使用禁止
```

## 違反検出コマンド
```bash
grep -r "@supabase/supabase-js" src/ --include="*.ts" --include="*.tsx"
# src/network/supabaseClient.ts のみ出力されること
```
