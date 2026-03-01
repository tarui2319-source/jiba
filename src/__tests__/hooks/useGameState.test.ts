/**
 * @jest-environment jsdom
 *
 * useGameState のユニットテスト。
 * SURRENDER アクションの検証。
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../hooks/useGameState';

describe('useGameState', () => {
  describe('SURRENDER', () => {
    it('blue が降参すると red の勝ちになる', () => {
      const { result } = renderHook(() => useGameState('quick'));

      act(() => { result.current.surrender('first'); });

      expect(result.current.gameState.result).not.toBeNull();
      expect(result.current.gameState.result!.winner).toBe('second');
      expect(result.current.gameState.surrenderedBy).toBe('first');
      expect(result.current.gameState.turnState.phase).toBe('finished');
    });

    it('red が降参すると blue の勝ちになる', () => {
      const { result } = renderHook(() => useGameState('quick'));

      act(() => { result.current.surrender('second'); });

      expect(result.current.gameState.result).not.toBeNull();
      expect(result.current.gameState.result!.winner).toBe('first');
      expect(result.current.gameState.surrenderedBy).toBe('second');
    });

    it('ゲーム終了後の降参は無視される', () => {
      const { result } = renderHook(() => useGameState('quick'));

      // まず降参
      act(() => { result.current.surrender('first'); });
      const resultAfterFirst = result.current.gameState.result;

      // もう一度降参しても状態は変わらない
      act(() => { result.current.surrender('second'); });
      expect(result.current.gameState.result).toBe(resultAfterFirst);
      expect(result.current.gameState.surrenderedBy).toBe('first');
    });

    it('降参後のリセットで surrenderedBy がクリアされる', () => {
      const { result } = renderHook(() => useGameState('quick'));

      act(() => { result.current.surrender('first'); });
      expect(result.current.gameState.surrenderedBy).toBe('first');

      act(() => { result.current.resetGame(); });
      expect(result.current.gameState.surrenderedBy).toBeUndefined();
      expect(result.current.gameState.result).toBeNull();
    });

    it('降参時の result に firstCount/secondCount が含まれる', () => {
      const { result } = renderHook(() => useGameState('quick'));

      act(() => { result.current.surrender('first'); });

      const gameResult = result.current.gameState.result!;
      expect(typeof gameResult.firstCount).toBe('number');
      expect(typeof gameResult.secondCount).toBe('number');
      expect(typeof gameResult.firstPower).toBe('number');
      expect(typeof gameResult.secondPower).toBe('number');
    });
  });
});
