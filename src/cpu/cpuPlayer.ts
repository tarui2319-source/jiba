/**
 * JIBA CPU — 手選択エンジン
 * 4段階の難易度に応じた最善手を返す。
 * 純粋関数（副作用なし）。engine 以外への依存なし。
 */

import { Board, Player, Action } from '../engine/types';
import { getLegalMoves } from '../engine/legalMoves';
import { getRandomMove } from '../engine/randomMove';
import { applyAction } from '../engine/applyAction';
import { computeInfluence } from '../engine/influence';
import { scoreBoard, scoreMove } from './evaluate';
import { CpuDifficulty } from '../constants/cpuConfig';

const opponent = (p: Player): Player => (p === 'first' ? 'second' : 'first');

// ──────────────────────────────────────────────────────────────────────────────
// 内部ヘルパー
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 貪欲法で最善手を返す。
 *
 * @param board         現在の盤面
 * @param player        手を打つプレイヤー
 * @param size          盤面サイズ
 * @param includePower  true=Lv3相当（影響力タイブレーク込み）
 *                      false=Lv2相当（支配マス差のみ、タイはランダム）
 * @param rand          乱数関数（テスト用インジェクション）
 */
function greedyMove(
  board: Board,
  player: Player,
  size: number,
  includePower: boolean,
  rand: () => number = Math.random,
): Action | null {
  const moves = getLegalMoves(board, player, size);
  if (moves.length === 0) return null;

  // 各手のスコアを計算
  const scored = moves.map((move) => ({
    move,
    score: scoreMove(board, move, player, size, includePower),
  }));

  // 最高スコアを持つ手をフィルタ
  const maxScore = Math.max(...scored.map((s) => s.score));
  // 浮動小数点のブレを考慮して ε=0.0001 の範囲で同スコアとみなす
  const topMoves = scored
    .filter((s) => s.score >= maxScore - 0.0001)
    .map((s) => s.move);

  // Lv2（整数スコア）はタイの候補からランダム選択で多様性を確保
  // Lv3（浮動小数点）は実質的にタイが発生しないので先頭を返す
  if (!includePower) {
    return topMoves[Math.floor(rand() * topMoves.length)];
  }
  return topMoves[0];
}

/**
 * 1手読み：自手後に相手の最善手（Lv3相当）を想定して評価する。
 */
function lookaheadMove(
  board: Board,
  player: Player,
  size: number,
): Action | null {
  const moves = getLegalMoves(board, player, size);
  if (moves.length === 0) return null;

  const opp = opponent(player);

  const scored = moves.map((move) => {
    const nextBoard = applyAction(board, move, player);

    // 相手の最善手を Lv3 貪欲法で求める
    const oppMoves = getLegalMoves(nextBoard, opp, size);
    let evalBoard = nextBoard;

    if (oppMoves.length > 0) {
      let bestOppScore = -Infinity;
      let bestOppMove = oppMoves[0];

      for (const oppMove of oppMoves) {
        const oppNextBoard = applyAction(nextBoard, oppMove, opp);
        const oppInf = computeInfluence(oppNextBoard, size);
        const oppScore = scoreBoard(oppInf, opp, /* includePower */ true);
        if (oppScore > bestOppScore) {
          bestOppScore = oppScore;
          bestOppMove = oppMove;
        }
      }
      evalBoard = applyAction(nextBoard, bestOppMove, opp);
    }

    // 相手最善手後の盤面を自分の視点で評価
    const myInf = computeInfluence(evalBoard, size);
    return { move, score: scoreBoard(myInf, player, /* includePower */ true) };
  });

  const maxScore = Math.max(...scored.map((s) => s.score));
  const topMoves = scored
    .filter((s) => s.score >= maxScore - 0.0001)
    .map((s) => s.move);

  return topMoves[0];
}

// ──────────────────────────────────────────────────────────────────────────────
// 公開 API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 指定難易度で最善手を返す。合法手がなければ null。
 *
 * @param board      現在の盤面
 * @param player     CPU プレイヤー
 * @param size       盤面サイズ
 * @param difficulty 1〜4
 * @param rand       乱数関数（テスト用インジェクション、Lv1/2 のみ使用）
 */
export function getBestMove(
  board: Board,
  player: Player,
  size: number,
  difficulty: CpuDifficulty,
  rand: () => number = Math.random,
): Action | null {
  switch (difficulty) {
    case 1:
      // かんたん: 完全ランダム
      return getRandomMove(board, player, size, rand);
    case 2:
      // ふつう: 支配マス差のみ貪欲（タイはランダム）
      return greedyMove(board, player, size, /* includePower */ false, rand);
    case 3:
      // むずかしい: 支配マス差 + 影響力タイブレーク貪欲
      return greedyMove(board, player, size, /* includePower */ true);
    case 4:
      // さいきょう: 1手読みルックアヘッド
      return lookaheadMove(board, player, size);
  }
}
