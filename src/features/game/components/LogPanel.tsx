import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/features/game/utils/types';

interface LogPanelProps {
  log: LogEntry[];
}

export function LogPanel({ log }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div
      ref={scrollRef}
      className="h-48 overflow-y-auto rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white/90"
      style={{ width: 300 }}
    >
      {log.length === 0 ? (
        <p className="text-white/40 italic text-xs">En attente des actions…</p>
      ) : (
        log.map(entry => (
          <div key={entry.turn} className="mb-1.5">
            <div className="font-bold text-yellow-300 text-xs uppercase tracking-wide">
              Tour {entry.turn}
            </div>
            {entry.actions.map((action, i) => (
              <div key={i} className="pl-3 text-white/80">
                {action}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
