# JIBA

## WHAT
- 目的: ターン制陣取り戦略ゲーム。iOS/Android向け
- スタック: React Native + Expo + TypeScript + Supabase Realtime
- 構造:
  src/            — アプリケーションコード
  src/engine/     — 影響力計算エンジン（純粋関数・UI非依存）
  src/screens/    — 画面コンポーネント
  src/components/ — 再利用UIパーツ
  src/hooks/      — カスタムフック
  src/constants/  — ShapeType定義・段位定義・設定値
  src/network/    — Supabase Realtime接続（外部通信はここだけ）
  src/cpu/        — CPU対戦AI（ルールベース貪欲法）
  src/i18n/       — 日本語・英語の2言語対応
  .claude/        — skills, agents, rules, plans

## WHY
- Core Rules:
  1. 外部通信はSupabase Realtimeのみ。それ以外は絶対禁止
  2. PII収集禁止。マッチング用セッションIDのみ（anonymous）
  3. analytics/ads/tracking禁止（v1は完全無料・広告なし）
  4. ゲームバランスに影響する課金は永久禁止
  5. 1タスク1コミット。証跡を残す
- Stop & Ask: 外部API追加/課金導入/OS権限/認証変更/破壊的操作/エラー3回
- ゲーム仕様の変更は必ずStop & Ask（仕様は厳守・変更不可）

## HOW
- build: eas build --profile development
- test: npm test
- lint: npx eslint src/
- 本番build: eas build --profile production
- 検証順序: lint → test → Security Gate
- エンジンテスト: npm test -- --testPathPattern=engine（影響力計算の単体テスト）
- 詳細は .claude/skills/ を参照

## Compact Instructions
compaction時に必ず保持:
- 現在のタスクと進捗
- 変更済みファイル一覧
- 未解決のエラー
- Core Rules要約（特にSupabase以外の外部通信禁止）
- ゲーム仕様の要点（ShapeType6種、影響力計算、重設ルール）
- MVP進行状況（7ステップのどこか）

## 禁止ディレクトリ
node_modules/ .expo/ ios/Pods/ android/build/ dist/ .git/ coverage/
