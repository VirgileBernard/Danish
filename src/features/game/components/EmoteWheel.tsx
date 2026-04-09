import { useEffect, useState } from 'react';

const EMOTES = ['😊', '😐', '😍', '😵'];

interface Props {
  onEmote: (emote: string) => void;
}

export function EmoteWheel({ onEmote }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 3000);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-xl p-1 hover:scale-110 transition-transform">
        😊
      </button>
      {open && (
        <div className="absolute bottom-8 left-0 grid grid-cols-2 gap-1 bg-black/80 rounded-lg p-2 z-20">
          {EMOTES.map(e => (
            <button key={e} onClick={() => { onEmote(e); setOpen(false); }}
              className="text-2xl p-3 hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
