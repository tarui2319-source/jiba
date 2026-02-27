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

  // ── How to Play ────────────────────────
  howto_btn: '?',
  howto_title: 'How to Play',
  howto_close: 'Close',

  howto_objective_title: '🎯 Objective',
  howto_objective_desc: 'Control more squares than your opponent when the game ends — and you win!',

  howto_play_title: '📋 Basic Flow',
  howto_play_step1: '① Tap a square on the board to select it',
  howto_play_step2: '② Pick a shape from the WAVE',
  howto_play_step3: '③ Press "Confirm" to spread your influence',

  howto_influence_title: '✨ Influence',
  howto_influence_desc: 'Placing a shape spreads influence to surrounding squares, coloring them yours. Stack shapes on the same square to reach even farther!',

  howto_shapes_title: '🔷 Shape Types',
  howto_shapes_desc: '6 shapes: WEAK, LINE, ELBOW, T, SQUARE, CROSS. Stronger shapes reach a wider area.',

  howto_tip_title: '💡 Tip',
  howto_tip_desc: "Stack your shapes on the opponent's strong squares to take back control!",
};
