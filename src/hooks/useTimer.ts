/**
 * JIBA — 20秒ターンタイマー
 * タイムアウト時にコールバックを呼び出す。
 * 残り TIMER_WARNING_SECONDS 以下で isWarning=true。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TURN_SECONDS, TIMER_WARNING_SECONDS } from '../constants/gameConfig';

interface UseTimerReturn {
  seconds: number;
  isWarning: boolean;
  reset: () => void;
  pause: () => void;
}

export function useTimer(onTimeout: () => void, active: boolean): UseTimerReturn {
  const [seconds, setSeconds] = useState(TURN_SECONDS);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    setSeconds(TURN_SECONDS);
  }, [clear]);

  const pause = useCallback(() => {
    clear();
  }, [clear]);

  useEffect(() => {
    if (!active) {
      clear();
      return;
    }

    setSeconds(TURN_SECONDS);

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clear();
          onTimeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clear;
  }, [active, clear]);

  return {
    seconds,
    isWarning: seconds <= TIMER_WARNING_SECONDS,
    reset,
    pause,
  };
}
