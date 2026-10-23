import { useState, useCallback, useRef } from 'react';
import type { TerminalLog, LogLevel } from '@/types/settings';

const STORAGE_KEY = 'xhunter-terminal-logs';
const MAX_LOGS = 200;

let logIdCounter = 1;

function now(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function loadInitial(): TerminalLog[] {
  return [
    { id: logIdCounter++, timestamp: now(), level: 'INFO', message: 'X-Hunter AI dashboard initialized.' },
    { id: logIdCounter++, timestamp: now(), level: 'INFO', message: 'Waiting for hunting commands…' },
  ];
}

export interface SequenceStep {
  delay: number;
  level: LogLevel;
  message: string;
  callback?: () => void | Promise<void>;
}

export function useTerminal() {
  const [logs, setLogs] = useState<TerminalLog[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as TerminalLog[];
    } catch { /* noop */ }
    return loadInitial();
  });
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);

  const pushLog = useCallback((level: LogLevel, message: string) => {
    const log: TerminalLog = { id: logIdCounter++, timestamp: now(), level, message };
    setLogs((prev) => {
      const next = [...prev, log].slice(-MAX_LOGS);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const runSequence = useCallback(
    async (steps: SequenceStep[]) => {
      runningRef.current = true;
      setIsRunning(true);
      for (const step of steps) {
        if (!runningRef.current) break;
        await new Promise((r) => setTimeout(r, step.delay));
        if (!runningRef.current) break;
        pushLog(step.level, step.message);
        if (step.callback) {
          try {
            await step.callback();
          } catch (err) {
            pushLog('ERROR', `Unexpected error: ${(err as Error).message}`);
          }
        }
      }
      runningRef.current = false;
      setIsRunning(false);
    },
    [pushLog],
  );

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    pushLog('WARNING', 'Execution stopped by user.');
  }, [pushLog]);

  const clear = useCallback(() => {
    setLogs([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  return { logs, isRunning, pushLog, runSequence, stop, clear };
}
