/**
 * JIBA — 日本語文字列定義
 * UI テキストの正規リスト。en.ts はこれと同じキーを持つ。
 */

export const ja = {
  // ── アプリ全般 ─────────────────────────
  game_title: 'JIBA',
  game_subtitle: '陣地争い戦略ゲーム',
  your_rank: 'あなたの段位',
  language: '言語',

  // ── 対戦モード ─────────────────────────
  battle_mode: '対戦モード',
  mode_local: '2人対戦',
  mode_cpu: 'CPU対戦',
  mode_online: 'オンライン',

  // ── CPU難易度 ──────────────────────────
  cpu_difficulty: 'CPU難易度',
  diff_1: 'かんたん',
  diff_2: 'ふつう',
  diff_3: 'むずかしい',
  diff_4: 'さいきょう',

  // ── ボタン ─────────────────────────────
  start: 'スタート',
  matchmaking_start: 'マッチング開始',
  restart: 'もう一度',
  cancel: 'キャンセル',
  retry: '再試行',
  go_home: 'ホームに戻る',

  // ── ゲーム中 ───────────────────────────
  confirm: '確定',
  waiting: '待機中',
  surrender: '降参',
  surrender_cancel: 'やめる',
  surrender_confirm: '本当に降参',
  moves_left: '残{n}手',
  wave: 'WAVE',

  // ── 結果 ───────────────────────────────
  blue_wins: 'BLUE の勝ち！',
  red_wins: 'RED の勝ち！',
  draw: '引き分け',
  blue_surrender: 'BLUE が降参',
  red_surrender: 'RED が降参',
  squares: 'マス',
  power: 'パワー: ',

  // ── マッチング ─────────────────────────
  searching: '対戦相手を探しています...',
  waiting_for_opponent: '相手の接続を待っています...',
  elapsed_sec: '{n}秒',
  matching_error_title: 'マッチングエラー',

  // ── 接続 ───────────────────────────────
  reconnecting: '📡 再接続中...',
  connection_failed_title: '接続が切断されました',
  connection_failed_msg: '通信に問題が発生し、再接続できませんでした。\nホームから再度マッチングしてください。',

  // ── ユーザーネーム ─────────────────────
  username_title: 'ユーザー名を設定',
  username_placeholder: '1〜12文字で入力',
  username_save: '設定する',
  username_edit: '変更',
  username_error_empty: '名前を入力してください',
  username_error_long: '12文字以内で入力してください',

  // ── 段位 ───────────────────────────────
  rank_up: '⬆ 昇段！',
  rank_down: '⬇ 降格',

  // ── メニュー ───────────────────────────────────────
  menu_title: 'メニュー',
  menu_close: '閉じる',
  menu_back: '戻る',
  menu_rules: 'ルール説明',
  menu_username_item: '名前変更',
  menu_language_item: '言語設定',

  // ── チュートリアルスライド ──────────────────────────
  tut_prev: '前へ',
  tut_next: '次へ',
  tut_done: '完了',

  tut_1_title: '🎯 目標',
  tut_1_desc: '対戦終了時に、相手より多くのマスを支配していれば勝利！',

  tut_2_title: '① マスを選ぶ',
  tut_2_desc: '盤面のマスをタップして、シェイプを置く場所を選ぼう',

  tut_3_title: '② シェイプを選ぶ',
  tut_3_desc: 'WAVEから好きなシェイプを選ぼう。種類によってパワーの広がり方が変わる！',

  tut_4_title: '③ パワーを広げる',
  tut_4_desc: '「確定」を押すと、シェイプを中心に周囲のマスへパワーが広がる',

  tut_5_title: '④ 設置ルール',
  tut_5_desc: '自分が支配しているマスならどこでも置ける。同じマスに重ねてパワーを強化しよう！',

  tut_6_title: '⑤ ターン交代とパワー計算',
  tut_6_desc: 'ターン終了後に相手のターン。パワーを比べてマスの所属が決まる',
} as const;

export type I18nKey = keyof typeof ja;
