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
  power: '力: ',

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

  // ── 遊び方 ─────────────────────────────
  howto_btn: '?',
  howto_title: '遊び方',
  howto_close: '閉じる',

  howto_objective_title: '🎯 目標',
  howto_objective_desc: '対戦終了時に、相手より多くのマスを支配していれば勝利！',

  howto_play_title: '📋 基本の流れ',
  howto_play_step1: '① 盤面のマスをタップして配置場所を選ぶ',
  howto_play_step2: '② WAVE から好きなシェイプ（形）を選ぶ',
  howto_play_step3: '③「確定」を押して影響力を広げる',

  howto_influence_title: '✨ 影響力',
  howto_influence_desc: 'シェイプを置くと、周囲のマスに影響力が広がり自分の色に染まる。同じマスに重ねて置く（スタック）と、影響力がさらに遠くまで届く！',

  howto_shapes_title: '🔷 シェイプ種類',
  howto_shapes_desc: 'WEAK・LINE・ELBOW・T字・SQUARE・CROSS の6種類。強いシェイプほど広い範囲に影響力が届く。',

  howto_tip_title: '💡 ヒント',
  howto_tip_desc: '相手の強い陣地に自分のシェイプを重ねて、支配権を奪い返そう！',
} as const;

export type I18nKey = keyof typeof ja;
