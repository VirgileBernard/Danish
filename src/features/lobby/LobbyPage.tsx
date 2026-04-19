import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/features/game/store/gameStore';
import type { BotDifficulty } from '@/features/game/utils/types';

const DIFFICULTY_LEVELS: { label: string; value: BotDifficulty; desc: string }[] = [
  { label: 'Facile',    value: 'easy',   desc: 'Les bots jouent au hasard, sans aucune stratégie.' },
  { label: 'Moyen',     value: 'medium', desc: 'Les bots appliquent quelques stratégies de base.' },
  { label: 'Difficile', value: 'hard',   desc: 'Les bots jouent avec une stratégie avancée — prépare-toi !' },
];

const DIFFICULTY_BG: Record<BotDifficulty, string> = {
  easy:   'hsl(27, 64%, 52%)',
  medium: 'hsl(27, 81%, 43%)',
  hard:    'hsl(0, 81%, 43%)',
};

const DIFFICULTY_TEXT: Record<BotDifficulty, string> = {
  easy:   'hsl(0, 80%, 25%)',
  medium: '#fff',
  hard:   'hsl(0, 100%, 80%)',
};

interface LobbyPageProps {
  onNavigate: (path: string) => void;
}

export function LobbyPage({ onNavigate }: LobbyPageProps) {
  const { setDifficulty } = useGameStore();
  const [diffIndex, setDiffIndex] = useState(0);

  const currentDiff = DIFFICULTY_LEVELS[diffIndex]!;

  function handlePlay() {
    setDifficulty(currentDiff.value);
    onNavigate('/game');
  }

  return (
    <div className="min-h-screen text-white">
      {/* ── Hero ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-0 px-6 text-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '500px', height: '500px', objectFit: 'contain', flexShrink: 0 }}
          >
            <source src="./DWC_V4.webm" type="video/webm" />
          </video>
          <h1
            style={{
              fontFamily: 'var(--font-title)',
              fontWeight: 900,
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              color: 'white',
              textShadow: '0 2px 20px rgba(0,0,0,0.25)',
              maxWidth: '600px',
              lineHeight: 1.15,
              marginTop: '-1rem',
            }}
          >
            Bienvenue sur le site officiel du<br />Danish World Championship
          </h1>
        </div>
      </section>

      {/* ── Cards ── */}
      <motion.section
        className="px-6 pb-16"
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 4.3 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {/* Card 1 — Rules */}
          <div
            className="rounded-2xl p-8 shadow-xl flex flex-col"
            style={{ backgroundColor: '#166534', minHeight: '62vh' }}
          >
            <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', lineHeight: 1.1 }}>
              Rules
            </h2>
            <p style={{ marginTop: '1.6rem', fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.5, height: '174px' }}>
              Vous découvrez le Danish ? Explorez les règles pour comprendre le fonctionnement du jeu via des exemples interactifs.<br /><br />Feature incoming !
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              {/* <button
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                Voir les règles →
              </button> */}
            </div>
          </div>

          {/* Card 2 — Play */}
          <motion.div
            className="rounded-2xl p-8 shadow-xl flex flex-col"
            style={{ minHeight: '62vh' }}
            animate={{ backgroundColor: DIFFICULTY_BG[currentDiff.value] }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <motion.h2
              style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', lineHeight: 1.1 }}
              animate={{ color: DIFFICULTY_TEXT[currentDiff.value] }}
              transition={{ duration: 0.4 }}
            >
              Play a game
            </motion.h2>

            <div style={{ marginTop: '1.5rem' }}>
              <div className="flex justify-between" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                {DIFFICULTY_LEVELS.map((d, i) => (
                  <motion.span
                    key={d.value}
                    animate={{
                      color: DIFFICULTY_TEXT[currentDiff.value],
                      opacity: i === diffIndex ? 1 : 0.6,
                      fontWeight: i === diffIndex ? 700 : 400,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {d.label}
                  </motion.span>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={diffIndex}
                onChange={(e) => setDiffIndex(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{
                  appearance: 'none',
                  height: '4px',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.4)',
                  outline: 'none',
                  accentColor: 'white',
                }}
              />
              <p style={{ marginTop: '0.9rem', fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.5, minHeight: '3em' }}>
                {currentDiff.desc}
              </p>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <button
                onClick={handlePlay}
                className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.92)', color: '#1a1a1a' }}
              >
                Jouer →
              </button>
            </div>
          </motion.div>

          {/* Card 3 — Profil */}
          <div
            className="rounded-2xl p-8 shadow-xl flex flex-col pointer-events-none select-none"
            style={{
              background: 'linear-gradient(135deg, #312e81, #1e3a8a)',
              minHeight: '62vh',
              opacity: 0.65,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-title)',
                fontWeight: 700,
                fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                lineHeight: 1.1,
                opacity: 0.75,
              }}
            >
              Profil
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.5 }}>
              Créez votre compte pour avoir accès à l'espace profil.<br /><br />Feature incoming !
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              {/* <span style={{ fontStyle: 'italic', fontSize: '0.85rem', opacity: 0.55 }}>coming soon</span> */}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
