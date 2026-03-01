/**
 * JIBA — useSoundEffects フック
 * 効果音 + 触覚フィードバック。
 * - Web: Web Audio API (AudioContext) で波形を合成（外部ファイル不要）
 * - Native: expo-haptics でフィードバック
 * - 外部通信なし・エンジン非依存の純粋UIフック
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';

// expo-haptics は try/catch でロード（Web では null）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {}

// ──────────────────────────────────────────────────────────────
// Web Audio API ユーティリティ
// ──────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = (typeof AudioContext !== 'undefined' ? AudioContext : (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AC();
    }
    // suspended の場合は resume（ユーザー操作後なので問題なし）
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function playTone({ freq, duration, type = 'sine', gain = 0.25, delay = 0 }: ToneOptions): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gainNode.gain.setValueAtTime(gain, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  } catch {}
}

// ──────────────────────────────────────────────────────────────
// フック
// ──────────────────────────────────────────────────────────────

export function useSoundEffects() {
  // 着手音: 短い打撃音
  const playPlace = useCallback(() => {
    if (Platform.OS === 'web') {
      playTone({ freq: 480, duration: 0.08, type: 'square', gain: 0.12 });
    } else {
      Haptics?.impactAsync?.('light').catch(() => {});
    }
  }, []);

  // 勝利音: C-E-G 上昇アルペジオ
  const playWin = useCallback(() => {
    if (Platform.OS === 'web') {
      [
        { freq: 523, delay: 0.00 },  // C5
        { freq: 659, delay: 0.13 },  // E5
        { freq: 784, delay: 0.26 },  // G5
        { freq: 1047, delay: 0.40 }, // C6
      ].forEach(({ freq, delay }) =>
        playTone({ freq, duration: 0.22, type: 'sine', gain: 0.28, delay })
      );
    } else {
      Haptics?.notificationAsync?.('success').catch(() => {});
    }
  }, []);

  // 敗北音: 下降
  const playLoss = useCallback(() => {
    if (Platform.OS === 'web') {
      [
        { freq: 392, delay: 0.00 }, // G4
        { freq: 330, delay: 0.15 }, // E4
        { freq: 262, delay: 0.30 }, // C4
      ].forEach(({ freq, delay }) =>
        playTone({ freq, duration: 0.20, type: 'sine', gain: 0.22, delay })
      );
    } else {
      Haptics?.notificationAsync?.('error').catch(() => {});
    }
  }, []);

  // 引き分け音: 中音1回
  const playDraw = useCallback(() => {
    if (Platform.OS === 'web') {
      playTone({ freq: 392, duration: 0.25, type: 'sine', gain: 0.22 });
    } else {
      Haptics?.impactAsync?.('medium').catch(() => {});
    }
  }, []);

  // 昇段音: 明るいフレーズ
  const playRankUp = useCallback(() => {
    if (Platform.OS === 'web') {
      [
        { freq: 523, delay: 0.00 },  // C5
        { freq: 784, delay: 0.12 },  // G5
        { freq: 1047, delay: 0.24 }, // C6
        { freq: 1319, delay: 0.36 }, // E6
      ].forEach(({ freq, delay }) =>
        playTone({ freq, duration: 0.18, type: 'sine', gain: 0.30, delay })
      );
    } else {
      Haptics?.notificationAsync?.('success').catch(() => {});
      setTimeout(() => Haptics?.notificationAsync?.('success').catch(() => {}), 300);
    }
  }, []);

  // ボタンタップ音: 軽いクリック
  const playTap = useCallback(() => {
    if (Platform.OS === 'web') {
      playTone({ freq: 600, duration: 0.04, type: 'square', gain: 0.08 });
    } else {
      Haptics?.selectionAsync?.().catch(() => {});
    }
  }, []);

  return { playPlace, playWin, playLoss, playDraw, playRankUp, playTap };
}
