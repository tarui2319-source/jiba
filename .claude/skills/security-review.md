# security-review

JIBAのSecurity Gate。コミット前・リリース前に必ず確認。

## Security Gate 6項目

### 1. 外部通信チェック（最重要）
```bash
# supabase以外のimportがsrc/network/外にないか確認
grep -r "@supabase/supabase-js" src/ --include="*.ts" --include="*.tsx"
# → src/network/supabaseClient.ts のみであること

# その他の外部通信ライブラリがないか
grep -rE "fetch\(|axios|http\.|https\." src/ --include="*.ts" --include="*.tsx"
# → 検出されたら即Stop & Ask
```

### 2. PII・シークレットチェック
```bash
# ハードコードされたシークレットがないか
grep -rE "(password|secret|api.key|private.key)\s*=" src/ --include="*.ts" -i
# → 検出されたら即削除

# PII収集コードがないか
grep -rE "(email|phone|address|name.*=)" src/ --include="*.ts" -i
# → anonymous UUIDのみ許可
```

### 3. analytics/ads/trackingチェック
```bash
grep -rE "(analytics|amplitude|mixpanel|firebase|ads|tracking)" src/ --include="*.ts" -i
# → 検出されたら即Stop & Ask（v1は完全禁止）
```

### 4. .envファイルチェック
```bash
# .envが.gitignoreされているか確認
cat .gitignore | grep "\.env"

# .envがgit管理下にないか
git ls-files | grep "\.env"
# → 何も出力されないこと
```

### 5. 依存関係チェック
```bash
npm audit --audit-level=high
# high以上の脆弱性がないこと
# あれば: npm audit fix（breaking changesがあるものはStop & Ask）
```

### 6. ゲーム仕様整合性チェック
```bash
# ShapeKindが7種類であること（仕様固定）
grep -A 10 "ShapeKind" src/engine/types.ts

# Player識別子がfirst/secondのみ（blue/red廃止済み）
grep -rE "\b(blue|red)\b" src/ --include="*.ts" --include="*.tsx" | grep -v "Colors\|color\|Color\|blue\|red" || true
```

## リリース前チェックリスト
- [ ] Security Gate 6項目すべてクリア
- [ ] npm test 全スイート通過
- [ ] npx eslint src/ エラーなし
- [ ] npm run typecheck エラーなし
- [ ] eas build --profile production 成功
