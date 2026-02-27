/**
 * JIBA — CPU対戦フック
 * CPU のターンになると自動的に手を計算して applyMove を呼び出す。
 */

import { useEffect, useRef, useState } from 'react';
import { Player } from '../engine/types';
import { CpuDifficulty, CPU_THINK_MS } from '../constants/cpuConfig';
import { getBestMove } from '../cpu/cpuPlayer';
import { UseGameStateReturn } from './useGameState';

interface UseCpuOpponentOptions {
  /** useGameState の返り値そのもの */
  gameStateReturn: UseGameStateReturn;
  /** CPU対戦モードが有効か */
  isCpuMode: boolean;
  /** CPU が担当するプレイヤー（固定: 'red'） */
  cpuSide: Player;
  /** 難易度 1〜4 */
  difficulty: CpuDifficulty;
}

interface UseCpuOpponentResult {
  /** CPU が思考中（演出ディレイ中）かどうか */
  isCpuThinking: boolean;
}

export function useCpuOpponent({
  gameStateReturn,
  isCpuMode,
  cpuSide,
  difficulty,
}: UseCpuOpponentOptions): UseCpuOpponentResult {
  const { gameState, applyMove, size } = gameStateReturn;
  const { board, turnState, result } = gameState;
  const { currentPlayer, phase } = turnState;

  const [isCpuThinking, setIsCpuThinking] = useState(false);
  // ダブルトリガー防止フラグ（cleanup が走る前に次の effect が起動するケース）
  const pendingRef = useRef(false);

  useEffect(() => {
    // CPU モードが OFF、ゲーム終了済み、CPU のターンでない場合は何もしない
    if (!isCpuMode) return;
    if (result !== null) return;
    if (phase !== 'playing') return;
    if (currentPlayer !== cpuSide) return;
    if (pendingRef.current) return;

    pendingRef.current = true;
    setIsCpuThinking(true);

    const delay = CPU_THINK_MS[difficulty];
    // board をクロージャでキャプチャ（ターン変更後の最新ボードを使う）
    const capturedBoard = board;

    const timer = setTimeout(() => {
      const move = getBestMove(capturedBoard, cpuSide, size, difficulty);
      if (move) applyMove(move);
      pendingRef.current = false;
      setIsCpuThinking(false);
    }, delay);

    return () => {
      clearTimeout(timer);
      pendingRef.current = false;
      setIsCpuThinking(false);
    };
    // currentPlayer・phase・result の変化（ターン交代・ゲーム終了）でトリガー
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, phase, result, isCpuMode, difficulty]);

  return { isCpuThinking };
}
