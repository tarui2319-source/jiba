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
} from 'react-native';
import { ShapeKind, Player } from '../engine/types';
import { getRandomMove } from '../engine/randomMove';
import { RatingState, DEFAULT_RATING } from '../engine/rankEngine';
import { fetchRating } from '../network/ratingService';
import { MY_PLAYER_ID, initPlayer } from '../network/supabaseClient';
import { deleteMyAccount } from '../network/accountService';
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
import { ConnectionFailedBanner } from '../components/ConnectionFailedBanner';
import { Colors, FontSize, Spacing, Radius, MIN_TAP } from '../constants/theme';
import { DEFAULT_MODE } from '../constants/gameConfig';
import { CpuDifficulty } from '../constants/cpuConfig';
import { MatchResult } from '../network/networkTypes';
import { useI18n } from '../i18n';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useUsername } from '../hooks/useUsername';
import { UsernameModal } from '../components/UsernameModal';

// expo-haptics は利用可能な場合のみ使用（Web では無視）
let Haptics: { impactAsync: (style: string) => Promise<void>; notificationAsync: (type: string) => Promise<void> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {
  // Web 環境など非対応の場合は無効化
}

function randomPlayer(): Player {
  return Math.random() < 0.5 ? 'first' : 'second';
}

export function GameScreen() {
  const { t } = useI18n();
  const { playPlace, playWin, playLoss, playDraw, playRankUp } = useSoundEffects();
  const { username, isSaving: isUsernameSaving, saveUsername } = useUsername();

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
  // CPU対戦: ゲーム開始のたびにコイントスで先後を決定
  const [cpuSide, setCpuSide] = useState<Player>('second');

  // ──────────────────────────────────────────────────────────────────
  // ユーザーネームモーダル
  // ──────────────────────────────────────────────────────────────────

  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  // 初回ユーザーネーム設定後にチュートリアルを自動表示するフラグ
  const [pendingTutorial, setPendingTutorial] = useState(false);

  // 初回起動時（username 未設定）はモーダルを表示
  useEffect(() => {
    if (username === null) setUsernameModalVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUsernameSave = useCallback(async (name: string) => {
    const isFirstTime = username === null;
    await saveUsername(name);
    setUsernameModalVisible(false);
    if (isFirstTime) setPendingTutorial(true);
  }, [saveUsername, username]);

  const handleUsernameEdit = useCallback(() => {
    setUsernameModalVisible(true);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    await deleteMyAccount();
    // 新しい匿名セッションを生成してアプリをリセット
    await initPlayer();
    resetGame(DEFAULT_MODE);
    setSetupVisible(true);
    setMatchResult(null);
    setUsernameModalVisible(true);
  }, [resetGame]);

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

  const { applyOnlineMove, surrenderOnline, isOnlineGame, myPlayer, isReconnecting, isConnectionFailed } = useOnlineGame({
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
    cpuSide: cpuSide,
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
    if (gameMode === 'cpu' && turnState.currentPlayer === cpuSide) return;
    // オンライン時: 相手のターンはスキップ
    if (!isMyTurn) return;
    if (isOnlineGame) {
      // オンライン: 合法手からランダムに選んで execMove（サーバー同期）
      const move = getRandomMove(board, turnState.currentPlayer, size);
      if (move) execMove(move);
    } else {
      applyRandomMove();
    }
    setSelectedCell(null);
    setSelectedShape(null);
  }, [isPlaying, gameMode, turnState.currentPlayer, cpuSide, isMyTurn, isOnlineGame, board, size, execMove, applyRandomMove]);

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
      if (gameMode !== 'cpu' || turnState.currentPlayer !== cpuSide) {
        Haptics?.impactAsync('medium').catch(() => {});
      }
    }
  }, [isWarning, isPlaying, seconds, gameMode, turnState.currentPlayer, isMyTurn, cpuSide]);

  // ──────────────────────────────────────────────────────────────────
  // セル選択
  // ──────────────────────────────────────────────────────────────────

  const handleCellPress = useCallback((row: number, col: number) => {
    if (!isPlaying || isCpuThinking) return;
    // CPU のターン中は人間が操作できない
    if (gameMode === 'cpu' && turnState.currentPlayer === cpuSide) return;
    // オンライン時: 相手のターン中は操作不可
    if (!isMyTurn) return;
    // 敵陣（相手が支配しているセル、または相手の駒があるセル）は選択不可
    const opponent = turnState.currentPlayer === 'first' ? 'second' : 'first';
    if (influence[row][col].controller === opponent) return;
    if (board[row][col].anchors.some(a => a.player === opponent)) return;
    setSelectedCell((prev) =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  }, [isPlaying, isCpuThinking, gameMode, turnState.currentPlayer, cpuSide, isMyTurn, influence, board]);

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
    playPlace();
    setSelectedCell(null);
    setSelectedShape(null);
  }, [canConfirm, isPlaying, selectedCell, selectedShape, board, execMove, playPlace]);

  // ──────────────────────────────────────────────────────────────────
  // スコア集計（表示用）
  // ──────────────────────────────────────────────────────────────────

  const firstCount = influence.flat().filter((c) => c.controller === 'first').length;
  const secondCount = influence.flat().filter((c) => c.controller === 'second').length;

  // ──────────────────────────────────────────────────────────────────
  // セットアップハンドラ
  // ──────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (gameMode === 'online') {
      // オンライン: マッチング開始（デフォルトモードでマッチング）
      startMatchmaking(DEFAULT_MODE);
    } else {
      if (gameMode === 'cpu') setCpuSide(randomPlayer());
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
  // SE: 結果音
  // ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!result) return;
    const mySide = isOnlineGame ? myPlayer : 'first';
    if (result.winner === 'draw') {
      playDraw();
    } else if (result.winner === mySide) {
      playWin();
    } else {
      playLoss();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // SE: 昇段音
  useEffect(() => {
    if (ratingDelta?.direction === 'up') playRankUp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingDelta]);

  // ──────────────────────────────────────────────────────────────────
  // 降参ハンドラ（インライン確認UI）
  // Alert.alert は Web/iframe 環境では window.confirm がブロックされて
  // コールバックが呼ばれないため、ステートベースで実装する。
  // ──────────────────────────────────────────────────────────────────

  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  // ゲーム終了・リセット時は確認ダイアログを閉じる
  useEffect(() => {
    if (result) setShowSurrenderConfirm(false);
  }, [result]);

  const handleSurrender = useCallback(() => {
    setShowSurrenderConfirm(true);
  }, []);

  const handleSurrenderConfirm = useCallback(() => {
    setShowSurrenderConfirm(false);
    if (isOnlineGame) {
      surrenderOnline();
    } else {
      // ローカル/CPU: 人間プレイヤーが降参
      const surrenderer = gameMode === 'cpu' ? 'first' : turnState.currentPlayer;
      surrender(surrenderer);
    }
  }, [isOnlineGame, surrenderOnline, gameMode, turnState.currentPlayer, surrender]);

  const handleSurrenderCancel = useCallback(() => {
    setShowSurrenderConfirm(false);
  }, []);

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
          firstCount={firstCount}
          secondCount={secondCount}
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
          {showSurrenderConfirm ? (
            // ── 降参確認モード ─────────────────────────────
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleSurrenderCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{t('surrender_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSurrender]}
                onPress={handleSurrenderConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>{t('surrender_confirm')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── 通常モード ─────────────────────────────────
            <>
              <TouchableOpacity
                testID="surrender-button"
                style={[styles.surrenderButton, !isPlaying && styles.surrenderButtonDisabled]}
                onPress={handleSurrender}
                disabled={!isPlaying}
                activeOpacity={0.8}
              >
                <Text style={styles.surrenderButtonText}>{t('surrender')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  {isCpuThinking ? '🤖' : (!isMyTurn ? t('waiting') : t('confirm'))}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 再接続バナー（オンライン時のみ, zIndex: 200） */}
        {isOnlineGame && isReconnecting && <ReconnectBanner />}

        {/* 接続失敗オーバーレイ（MAX_RETRIES超過, zIndex: 500） */}
        {isOnlineGame && isConnectionFailed && (
          <ConnectionFailedBanner onGoHome={handleRestart} />
        )}

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
            username={username}
            onEditUsername={handleUsernameEdit}
            openMenuWithTutorial={pendingTutorial}
            onMenuWithTutorialOpened={() => setPendingTutorial(false)}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {/* ユーザーネームモーダル（初回設定 + 変更） */}
        <UsernameModal
          visible={usernameModalVisible}
          initialValue={username}
          isSaving={isUsernameSaving}
          onSave={handleUsernameSave}
          onCancel={username !== null ? () => setUsernameModalVisible(false) : undefined}
        />
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
  // 降参: ゴーストボタン（赤みで危険アクションを明示）
  surrenderButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.red,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: MIN_TAP,
  },
  surrenderButtonDisabled: {
    borderColor: Colors.border,
    opacity: 0.4,
  },
  surrenderButtonText: {
    color: Colors.red,
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // 確認モードのキャンセルボタン
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: MIN_TAP,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
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
    justifyContent: 'center',
    minHeight: MIN_TAP,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.neutral,
  },
  confirmButtonSurrender: {
    backgroundColor: Colors.red,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
