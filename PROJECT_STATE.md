## PROJECT_STATE — 最終更新: 2026-03-01 (自動生成)
フェーズ: 開発中

完了:
- エンジン実装 (influence/legalMoves/applyAction/gameResult/rankEngine)
- CPU AI 4段階難易度
- Supabase Realtime オンライン対戦
- レーティングシステム (rank 1-10, points 0-99)
- i18n 日本語・英語
- UI全画面 (GameScreen + 全オーバーレイ)
- チュートリアル刷新 (6スライド)
- EASビルド設定
- Player識別子 first/second 統一 (blue/red廃止)

進行中: 開発体制立て直し → .claude/ 整備・ESLint設定

次:
1. ESLintパッケージインストール確認 & CI設定
2. ストアリリース準備 (スクリーンショット・審査提出)

申し送り:
- ShapeKindは7種類 (types.tsで定義: weak/mid_cross/mid_diag/strong_vert/strong_horiz/strong_diag_nwse/strong_diag_nesw)
- ゲーム仕様変更は絶対Stop & Ask
- Supabase以外の外部通信は絶対禁止
- テーブル: rooms / moves / player_ratings
