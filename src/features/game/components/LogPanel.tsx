import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/features/game/utils/types';

interface LogPanelProps {
  log: LogEntry[];
}

export function LogPanel({ log }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    if (!isLocked) return;
    const el = scrollRef.current;
    if (!el) return;
    // Defer to the next frame so the scroll height reflects the just-rendered
    // log entries (layout can still settle after commit in rare cases).
    // Depend on `log` reference rather than `log.length`: appendLogAction can
    // push a new action onto the current turn without growing the array length,
    // so we need the reference change to catch in-turn appends.
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [log, isLocked]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // User scrolled away from bottom → drop out of auto-scroll so they can
    // read history without being pulled down. Threshold absorbs the sub-pixel
    // residue from the auto-scroll itself (programmatic scroll lands exactly
    // at bottom, so atBottom stays true and this branch is skipped).
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    if (isLocked && !atBottom) setIsLocked(false);
  }

  return (
    <div className="relative" style={{ width: 300 }}>
      <button
        onClick={() => setIsLocked(v => !v)}
        title={isLocked ? 'Défilement auto (cliquer pour libérer)' : 'Libre (cliquer pour verrouiller en bas)'}
        className="absolute top-1 right-1 z-10 w-7 h-7 flex items-center justify-center rounded bg-black/70 hover:bg-black/90 text-white text-sm border border-white/10"
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-48 overflow-y-auto rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white/90"
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
    </div>
  );
}
