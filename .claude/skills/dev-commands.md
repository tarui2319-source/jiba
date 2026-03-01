# dev-commands

JIBAプロジェクトのビルド・テスト・リリースコマンド集。

## 検証順序（必ず守る）
```bash
npx eslint src/          # 1. lint
npm test                  # 2. テスト（全スイート）
npm run typecheck         # 3. 型チェック
```

## テスト
```bash
npm test                                          # 全テスト
npm test -- --testPathPattern=engine             # エンジン単体テストのみ
npm test -- --testPathPattern=cpu               # CPUテストのみ
npm test -- --coverage                           # カバレッジ付き（engine 80%以上必須）
npm test -- --watch                              # ウォッチモード
```

## Lint
```bash
npx eslint src/                  # 全ファイル
npx eslint src/engine/           # エンジンのみ
npx eslint src/ --fix            # 自動修正（注意: 必ず差分確認）
```

## 型チェック
```bash
npm run typecheck    # tsc --noEmit
```

## 開発サーバー
```bash
expo start           # Metro Bundler起動
expo start --ios     # iOSシミュレーター
expo start --android # Androidエミュレーター
```

## ビルド（EAS）
```bash
eas build --profile development   # 開発ビルド（シミュレーター用）
eas build --profile preview       # APK / 非シミュレーターiOS
eas build --profile production    # ストア提出用（バージョン自動インクリメント）
```

## Git（1タスク1コミット厳守）
```bash
git status
git diff
git add <specific-files>    # -A / . は使わない（.envや大ファイル混入リスク）
git commit -m "type(scope): 内容"
git push -u origin <branch>
```

## コミットメッセージ規約
```
feat:     新機能
fix:      バグ修正
refactor: 動作変更なしのリファクタリング
test:     テスト追加・修正
docs:     ドキュメントのみ
chore:    ビルド・設定変更
```
