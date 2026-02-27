/**
 * JIBA — ネットワーク層の型定義
 * DB 行型・MatchResult・コールバック型。
 * engine の型を参照しても良い（逆依存は禁止）。
 */

import { GameMode } from '../engine/types';

/** Supabase: rooms テーブルの行 */
export interface RoomRow {
  id: string;
  mode: GameMode;
  status: 'waiting' | 'playing' | 'finished';
  blue_id: string | null;  // JOIN 側プレイヤー（BLUE）
  red_id: string;          // CREATE 側プレイヤー（RED）
  created_at: string;
  updated_at: string;
}

/** Supabase: moves テーブルの行 */
export interface MoveRow {
  id: number;
  room_id: string;
  player: 'blue' | 'red';
  player_id: string;
  seq: number;              // 0-indexed ゲーム内通し番号（UNIQUE with room_id）
  move_type: 'build' | 'stack' | 'surrender';
  row: number;
  col: number;
  shape: string;            // ShapeKind
  created_at: string;
}

/** マッチング確定後の情報 */
export interface MatchResult {
  roomId: string;
  myPlayer: 'blue' | 'red';
  mode: GameMode;           // マッチしたゲームモード
  nextOpponentSeq: number;  // 初期同期後の次期待 seq（通常 0）
}

/** 相手手番到着時のコールバック */
export type OnOpponentMove = (move: MoveRow) => void;

/** Supabase: player_ratings テーブルの行 */
export interface RatingRow {
  player_id: string;
  username: string | null;  // 表示名（未設定時 null）
  rank: number;    // 1 〜 10
  points: number;  // 0 〜 99
  wins: number;
  losses: number;
  draws: number;
  updated_at: string;
}
