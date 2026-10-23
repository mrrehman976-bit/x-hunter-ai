import { useEffect, useRef } from 'react';
import { Terminal, Trash2, Square } from 'lucide-react';
import type { TerminalLog, LogLevel } from '@/types/settings';

interface TerminalConsoleProps {
  logs: TerminalLog[];
  isRunning: boolean;
  onClear: () => void;
  onStop: () => void;
}

const levelStyles: Record<LogLevel, { text: string; label: string }> = {
  INFO: { text: 'text-sky-400', label: 'text-sky-400' },
  SUCCESS: { text: 'text-emerald-400', label: 'text-emerald-400' },
  WARNING: { text: 'text-amber-400', label: 'text-amber-400' },
  ERROR: { text: 'text-red-400', label: 'text-red-400' },
};

export default function TerminalConsole({ logs, isRunning, onClear, onStop }: TerminalConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Terminal dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <div className="ml-1 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Execution Console</span>
          </div>
          {isRunning && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{logs.length} log entries</span>
          {isRunning && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Console body */}
      <div
        ref={scrollRef}
        className="scrollbar-thin max-h-[280px] min-h-[160px] overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600">$ Awaiting commands…</p>
        ) : (
          logs.map((log) => {
            const style = levelStyles[log.level];
            return (
              <div key={log.id} className="flex gap-2 py-0.5 animate-fade-in">
                <span className="flex-shrink-0 text-slate-600">{log.timestamp}</span>
                <span className={`flex-shrink-0 font-semibold ${style.label}`}>[{log.level}]</span>
                <span className={`break-all ${style.text}`}>{log.message}</span>
              </div>
            );
          })
        )}
        {isRunning && (
          <div className="flex items-center gap-1 py-0.5 text-slate-600">
            <span className="text-slate-600">{'>'}</span>
            <span className="h-3.5 w-1.5 animate-pulse bg-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}
