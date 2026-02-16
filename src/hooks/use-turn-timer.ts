'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerState } from '@/components/turn-timer';

interface UseTurnTimerOptions {
  initialSeconds: number;
  autoStart?: boolean;
  onExpire?: () => void;
}

interface UseTurnTimerReturn {
  timeRemaining: number;
  timerState: TimerState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  addTime: (seconds: number) => void;
}

/**
 * Hook for managing turn timer state
 */
export function useTurnTimer({
  initialSeconds,
  autoStart = false,
  onExpire,
}: UseTurnTimerOptions): UseTurnTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [timerState, setTimerState] = useState<TimerState>(
    autoStart ? 'running' : 'idle'
  );
  const onExpireRef = useRef(onExpire);
  
  // Keep onExpire callback ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Warning threshold
  const warningThreshold = 30;

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState === 'running' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            setTimerState('expired');
            onExpireRef.current?.();
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerState, timeRemaining]);

  // Update state based on time
  useEffect(() => {
    if (timeRemaining <= 0 && timerState !== 'expired') {
      setTimerState('expired');
    } else if (timeRemaining <= warningThreshold && timerState === 'running') {
      setTimerState('warning');
    } else if (timeRemaining > warningThreshold && timerState === 'warning') {
      setTimerState('running');
    }
  }, [timeRemaining, timerState]);

  const start = useCallback(() => {
    if (timeRemaining > 0 && timerState !== 'expired') {
      setTimerState('running');
    }
  }, [timeRemaining, timerState]);

  const pause = useCallback(() => {
    if (timerState === 'running' || timerState === 'warning') {
      setTimerState('paused');
    }
  }, [timerState]);

  const reset = useCallback(() => {
    setTimeRemaining(initialSeconds);
    setTimerState('idle');
  }, [initialSeconds]);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining((prev) => Math.max(0, prev + seconds));
    if (timerState === 'expired') {
      setTimerState(timeRemaining + seconds > warningThreshold ? 'running' : 'warning');
    }
  }, [timerState, timeRemaining]);

  return {
    timeRemaining,
    timerState,
    start,
    pause,
    reset,
    addTime,
  };
}
