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
};
