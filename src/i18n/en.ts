/**
 * JIBA — English strings
 * Must have the same keys as ja.ts.
 */

import { I18nKey } from './ja';

export const en: Record<I18nKey, string> = {
  // ── General ────────────────────────────
  game_title: 'JIBA',
  game_subtitle: 'Territory Strategy Game',
  your_rank: 'Your Rank',
  language: 'Language',

  // ── Game mode ──────────────────────────
  battle_mode: 'Game Mode',
  mode_local: '2 Players',
  mode_cpu: 'vs CPU',
  mode_online: 'Online',

  // ── CPU difficulty ─────────────────────
  cpu_difficulty: 'CPU Difficulty',
  diff_1: 'Easy',
  diff_2: 'Normal',
  diff_3: 'Hard',
  diff_4: 'Expert',

  // ── Buttons ────────────────────────────
  start: 'Start',
  matchmaking_start: 'Find Match',
  restart: 'Play Again',
  cancel: 'Cancel',
  retry: 'Retry',
  go_home: 'Go Home',

  // ── In-game ────────────────────────────
  confirm: 'Confirm',
  waiting: 'Waiting',
  surrender: 'Resign',
  surrender_cancel: 'Cancel',
  surrender_confirm: 'Resign Now',
  moves_left: '{n} Left',
  wave: 'WAVE',

  // ── Result ─────────────────────────────
  blue_wins: 'BLUE Wins!',
  red_wins: 'RED Wins!',
  draw: 'Draw',
  blue_surrender: 'BLUE Resigned',
  red_surrender: 'RED Resigned',
  squares: 'sq',
  power: 'Pow: ',

  // ── Matchmaking ────────────────────────
  searching: 'Finding an opponent...',
  waiting_for_opponent: 'Waiting for opponent...',
  elapsed_sec: '{n}s',
  matching_error_title: 'Matching Error',

  // ── Connection ─────────────────────────
  reconnecting: '📡 Reconnecting...',
  connection_failed_title: 'Connection Lost',
  connection_failed_msg: 'Unable to reconnect after several attempts.\nPlease go home and rematch.',

  // ── Username ───────────────────────────
  username_title: 'Set Username',
  username_placeholder: '1–12 characters',
  username_save: 'Save',
  username_edit: 'Edit',
  username_error_empty: 'Please enter a name',
  username_error_long: 'Must be 12 characters or less',

  // ── Rank ───────────────────────────────
  rank_up: '⬆ Promoted!',
  rank_down: '⬇ Demoted',

  // ── Menu ───────────────────────────────
  menu_title: 'Menu',
  menu_close: 'Close',
  menu_back: 'Back',
  menu_rules: 'How to Play',
  menu_username_item: 'Change Name',
  menu_language_item: 'Language',

  // ── Tutorial Slides ────────────────────
  tut_prev: 'Prev',
  tut_next: 'Next',
  tut_done: 'Done',

  tut_1_title: '🎯 Objective',
  tut_1_desc: 'Control more squares than your opponent when the game ends — and you win!',

  tut_2_title: '① Select a Square',
  tut_2_desc: 'Tap any square on the board to choose where to place your shape',

  tut_3_title: '② Pick a Shape',
  tut_3_desc: 'Choose any shape from the WAVE. Different shapes spread influence differently!',

  tut_4_title: '③ Spread Influence',
  tut_4_desc: 'Press "Confirm" to place the shape and spread influence to surrounding squares',

  tut_5_title: '🔄 Stack',
  tut_5_desc: 'Place multiple shapes on the same square. The more stacks, the farther the influence spreads!',
};
