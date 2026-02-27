/**
 * JIBA — GameScreen
 * ゲームの全UIを統合するメイン画面。
 * タイマー管理・セル選択・アクション確定・CPU対戦・オンライン対戦をここで行う。
 * MVP5: オンライン対戦（useMatchmaking / useOnlineGame）配線。
 * MVP6: 段位システム（usePlayerRating）配線。
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ShapeKind } from '../engine/types';
import { RatingState, DEFAULT_RATING } from '../engine/rankEngine';
import { fetchRating } from '../network/ratingService';
import { MY_PLAYER_ID } from '../network/supabaseClient';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import { useCpuOpponent } from '../hooks/useCpuOpponent';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { usePlayerRating } from '../hooks/usePlayerRating';
import { Board } from '../components/Board';
import { ScoreBar } from '../components/ScoreBar';
import { ShapeSelector } from '../components/ShapeSelector';
import { ResultOverlay } from '../components/ResultOverlay';
import { SetupOverlay, GameMode } from '../components/SetupOverlay';
import { MatchmakingOverlay } from '../components/MatchmakingOverlay';
import { ReconnectBanner } from '../components/ReconnectBanner';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { DEFAULT_MODE } from '../constants/gameConfig';
import { CpuDifficulty } from '../constants/cpuConfig';
import { MatchResult } from '../network/networkTypes';

// expo-haptics は利用可能な場合のみ使用（Web では無視）
let Haptics: { impactAsync: (style: string) => Promise<void>; notificationAsync: (type: string) => Promise<void> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch {
  // Web 環境など非対応の場合は無効化
}

/** CPU は常に RED を担当 */
const CPU_SIDE = 'red' as const;

export function GameScreen() {
  const gameStateReturn = useGameState(DEFAULT_MODE);
  const { gameState, applyMove, applyRandomMove, resetGame, surrender, size } = gameStateReturn;
  const { board, turnState, influence, result, surrenderedBy } = gameState;

  // ──────────────────────────────────────────────────────────────────
  // セットアップ状態
  // ──────────────────────────────────────────────────────────────────

  const [setupVisible, setSetupVisible] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [cpuDifficulty, setCpuDifficulty] = useState<CpuDifficulty>(2);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // ──────────────────────────────────────────────────────────────────
  // マッチング（オンラインモード）
  // ──────────────────────────────────────────────────────────────────

  const { matchState, startMatchmaking, cancelMatchmaking } = useMatchmaking();

  // マッチング完了時: matchResult を保存 → ゲーム開始
  useEffect(() => {
    if (matchState.status === 'matched') {
      setMatchResult(matchState.result);
      resetGame(matchState.result.mode);
      setSetupVisible(false);
    }
  }, [matchState.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────
  // オンラインゲーム（useOnlineGame）
  // ──────────────────────────────────────────────────────────────────

  const { applyOnlineMove, surrenderOnline, isOnlineGame, myPlayer, isReconnecting } = useOnlineGame({
    gameStateReturn,
    matchResult: gameMode === 'online' ? matchResult : null,
  });

  // ──────────────────────────────────────────────────────────────────
  // 段位システム（usePlayerRating）
  // ──────────────────────────────────────────────────────────────────

  const { currentRating, ratingDelta } = usePlayerRating({
    gameResult: result,
    myPlayer,
    isOnlineGame,
  });

  // ──────────────────────────────────────────────────────────────────
  // タイトル画面用段位ロード
  // ──────────────────────────────────────────────────────────────────

  const [titleRating, setTitleRating] = useState<RatingState | null>(null);

  useEffect(() => {
    if (!setupVisible) return;
    fetchRating(MY_PLAYER_ID)
      .then(row => {
        setTitleRating(row ? { rank: row.rank, points: row.points } : DEFAULT_RATING);
      })
      .catch(() => {
        setTitleRating(DEFAULT_RATING);
      });
  }, [setupVisible]);

  // 手番実行関数: オンライン時は applyOnlineMove、それ以外は applyMove
  const execMove = isOnlineGame ? applyOnlineMove : applyMove;

  // 選択状態
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeKind | null>(null);

  const isPlaying = turnState.phase === 'playing';

  // ──────────────────────────────────────────────────────────────────
  // CPU対戦フック
  // ──────────────────────────────────────────────────────────────────

  const { isCpuThinking } = useCpuOpponent({
    gameStateReturn,
    isCpuMode: gameMode === 'cpu',
    cpuSide: CPU_SIDE,
    difficulty: cpuDifficulty,
  });

  // CPU が思考中になったら選択状態をクリア
  useEffect(() => {
    if (isCpuThinking) {
      setSelectedCell(null);
      setSelectedShape(null);
    }
  }, [isCpuThinking]);

  // ──────────────────────────────────────────────────────────────────
  // タイムアウト処理
  // ──────────────────────────────────────────────────────────────────

  // オンライン時: 相手ターン中はランダム手を打たない（相手側がタイムアウトを管理）
  const isMyTurn = !isOnlineGame || turnState.currentPlayer === myPlayer;

  const handleTimeout = useCallback(() => {
    if (!isPlaying) return;
    // CPU のターン中はタイムアウトをスキップ
    if (gameMode === 'cpu' && turnState.currentPlayer === CPU_SIDE) return;
    // オンライン時: 相手のターンはスキップ
    if (!isMyTurn) return;
    if (isOnlineGame) {
      execMove({ type: 'build', row: 0, col: 0, shape: 'weak' }); // ランダム手（簡易）
    } else {
      applyRandomMove();
    }
    setSelectedCell(null);
    setSelectedShape(null);
  }, [isPlaying, gameMode, turnState.currentPlayer, isMyTurn, isOnlineGame, execMove, applyRandomMove]);

  // セットアップ中はタイマーを停止
  const { seconds, isWarning, reset: resetTimer } = useTimer(
    handleTimeout,
    isPlaying && !setupVisible,
  );

  // ターン交代のたびにタイマーをリセット & 選択状態クリア
  useEffect(() => {
    if (!isPlaying) return;
    setSelectedCell(null);
    setSelectedShape(null);
    resetTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnState.currentPlayer]);

  // 残り5秒で振動（人間のターンのみ）
  useEffect(() => {
    if (isWarning && isPlaying && seconds === 5 && isMyTurn) {
      if (gameMode !== 'cpu' || turnState.currentPlayer !== CPU_SIDE) {
        Haptics?.impactAsync('medium').catch(() => {});
      }
    }
  }, [isWarning, isPlaying, seconds, gameMode, turnState.currentPlayer, isMyTurn]);

  // ──────────────────────────────────────────────────────────────────
  // セル選択
  // ──────────────────────────────────────────────────────────────────

  const handleCellPress = useCallback((row: number, col: number) => {
    if (!isPlaying || isCpuThinking) return;
    // CPU のターン中は人間が操作できない
    if (gameMode === 'cpu' && turnState.currentPlayer === CPU_SIDE) return;
    // オンライン時: 相手のターン中は操作不可
    if (!isMyTurn) return;
    setSelectedCell((prev) =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  }, [isPlaying, isCpuThinking, gameMode, turnState.currentPlayer, isMyTurn]);

  // ──────────────────────────────────────────────────────────────────
  // アクション確定
  // ──────────────────────────────────────────────────────────────────

  const canConfirm = selectedCell !== null && selectedShape !== null && !isCpuThinking;

  const handleConfirm = useCallback(() => {
    if (!canConfirm || !isPlaying) return;

    const { row, col } = selectedCell!;
    const cell = board[row][col];
    const actionType = cell.anchors.length === 0 ? 'build' : 'stack';

    execMove({ type: actionType, row, col, shape: selectedShape! });
    setSelectedCell(null);
    setSelectedShape(null);
  }, [canConfirm, isPlaying, selectedCell, selectedShape, board, execMove]);

  // ──────────────────────────────────────────────────────────────────
  // スコア集計（表示用）
  // ──────────────────────────────────────────────────────────────────

  const blueCount = influence.flat().filter((c) => c.controller === 'blue').length;
  const redCount  = influence.flat().filter((c) => c.controller === 'red').length;

  // ──────────────────────────────────────────────────────────────────
  // セットアップハンドラ
  // ──────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (gameMode === 'online') {
      // オンライン: マッチング開始（デフォルトモードでマッチング）
      startMatchmaking(DEFAULT_MODE);
    } else {
      setSetupVisible(false);
      resetGame();
    }
  }, [gameMode, startMatchmaking, resetGame]);

  const handleRestart = useCallback(() => {
    // 対局後は設定画面に戻る
    setMatchResult(null);
    setGameMode('local');
    setSetupVisible(true);
  }, []);

  // マッチングキャンセル
  const handleCancelMatchmaking = useCallback(() => {
    cancelMatchmaking();
    setSetupVisible(true);
  }, [cancelMatchmaking]);

  // マッチングエラー時の再試行
  const handleRetryMatchmaking = useCallback(() => {
    startMatchmaking(DEFAULT_MODE);
  }, [startMatchmaking]);

  // ──────────────────────────────────────────────────────────────────
  // 降参ハンドラ
  // ──────────────────────────────────────────────────────────────────

  const handleSurrender = useCallback(() => {
    Alert.alert(
      '降参',
      '本当に降参しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '降参する',
          style: 'destructive',
          onPress: () => {
            if (isOnlineGame) {
              surrenderOnline();
            } else {
              // ローカル/CPU: 人間プレイヤーが降参
              const surrenderer = gameMode === 'cpu' ? 'blue' : turnState.currentPlayer;
              surrender(surrenderer);
            }
          },
        },
      ],
    );
  }, [isOnlineGame, surrenderOnline, gameMode, turnState.currentPlayer, surrender]);

  // ──────────────────────────────────────────────────────────────────
  // マッチングオーバーレイの表示判定
  // ──────────────────────────────────────────────────────────────────

  const showMatchmakingOverlay =
    matchState.status === 'searching' ||
    matchState.status === 'waiting_for_opponent' ||
    matchState.status === 'error';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* スコアバー */}
        <ScoreBar
          blueCount={blueCount}
          redCount={redCount}
          currentPlayer={turnState.currentPlayer}
          timerSeconds={seconds}
          isTimerWarning={isWarning}
          movesLeft={turnState.movesLeft}
          myPlayer={isOnlineGame ? myPlayer : undefined}
          myRating={isOnlineGame ? currentRating : undefined}
        />

        {/* 盤面 */}
        <View style={styles.boardWrapper}>
          <Board
            board={board}
            influence={influence}
            size={size}
            selectedCell={selectedCell}
            currentPlayer={turnState.currentPlayer}
            onCellPress={handleCellPress}
          />
        </View>

        {/* ShapeSelector */}
        <ShapeSelector
          selectedShape={selectedShape}
          onSelect={setSelectedShape}
        />

        {/* アクションバー */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            testID="surrender-button"
            style={styles.surrenderButton}
            onPress={handleSurrender}
            disabled={!isPlaying}
            activeOpacity={0.8}
          >
            <Text style={styles.surrenderButtonText}>降参</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              {isCpuThinking ? '🤖' : (!isMyTurn ? '待機中' : '確定')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 再接続バナー（オンライン時のみ, zIndex: 200） */}
        {isOnlineGame && isReconnecting && <ReconnectBanner />}

        {/* 結果オーバーレイ */}
        {result && (
          <ResultOverlay
            result={result}
            onRestart={handleRestart}
            ratingDelta={isOnlineGame ? ratingDelta : undefined}
            currentRating={isOnlineGame ? currentRating : undefined}
            surrenderedBy={surrenderedBy}
          />
        )}

        {/* マッチングオーバーレイ（ResultOverlay の上, SetupOverlay の下） */}
        {showMatchmakingOverlay && (
          <MatchmakingOverlay
            matchState={matchState}
            onCancel={handleCancelMatchmaking}
            onRetry={matchState.status === 'error' ? handleRetryMatchmaking : undefined}
          />
        )}

        {/* セットアップオーバーレイ（最前面） */}
        {setupVisible && (
          <SetupOverlay
            gameMode={gameMode}
            cpuDifficulty={cpuDifficulty}
            onSetGameMode={setGameMode}
            onSetDifficulty={setCpuDifficulty}
            onStart={handleStart}
            rating={titleRating}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── アクションバー ────────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  // 降参: ゴーストボタン（控えめ）
  surrenderButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    minWidth: 70,
  },
  surrenderButtonText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // 確定: メインCTA（大きく・鮮やか）
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.blue,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.neutral,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
