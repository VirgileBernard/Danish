import { useState } from 'react';
import { FileText, Play, User, ArrowRight, Info } from 'lucide-react';
import { useGameStore } from '@/features/game/store/gameStore';
import type { BotDifficulty } from '@/features/game/utils/types';

const STATIC_CARDS = [
  {
    // number: '01',
    tag: 'Règlement',
    title: 'Règles',
    description: 'Les règles officielles du Danish, non négociables. Consultez les variantes, les pénalités et les cas particuliers.',
    icon: FileText,
    accentVar: '--accent',
    footer: 'Feature incoming',
    href: '#',
    onClickPath: '/rules',
  },
  {
    // number: '03',
    tag: 'Compte',
    title: 'Profil',
    description: 'Consulte ton historique, tes statistiques, ton classement dans le tournoi et personnalise ton avatar DWC.',
    icon: User,
    accentVar: '--dwc-grey-blue',
    footer: 'Feature incoming',
    href: '#',
    onClickPath: '/profile',
  },
];

const DIFFICULTY_LEVELS: { label: string; value: BotDifficulty; desc: string }[] = [
  { label: 'Facile', value: 'easy', desc: 'Les bots jouent au hasard, sans aucune stratégie.' },
  { label: 'Moyen', value: 'medium', desc: 'Les bots appliquent quelques stratégies de base.' },
  { label: 'Difficile', value: 'hard', desc: 'Les bots jouent avec une stratégie avancée — prépare-toi !' },
];

interface QuickAccessCardsProps {
  onNavigate: (path: string) => void;
}

export function QuickAccessCards({ onNavigate }: QuickAccessCardsProps) {
  const { setDifficulty } = useGameStore();
  const [diffIndex, setDiffIndex] = useState(0);
  const currentDiff = DIFFICULTY_LEVELS[diffIndex]!;

  // Pourcentage de remplissage du slider (0%, 50%, 100%)
  const fillPercent = (diffIndex / (DIFFICULTY_LEVELS.length - 1)) * 100;

  function handlePlay() {
    setDifficulty(currentDiff.value);
    onNavigate('/game');
  }

  return (
    <section className="relative z-10 px-8 pb-24">
      <div className="max-w-[1280px] mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-8 text-[0.7rem] uppercase tracking-[0.15em] text-[hsl(var(--foreground-muted))]">
          <span className="flex-1 h-px bg-[hsl(var(--border))]" />
          Accès rapide
          <span className="flex-1 h-px bg-[hsl(var(--border))]" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Card 1 — Règles */}
          <CardStatic
            data={STATIC_CARDS[0]!}
            onClick={() => onNavigate(STATIC_CARDS[0]!.onClickPath)}
          />

          {/* Card 2 — Jouer (interactive) */}
          <CardPlay
            diffIndex={diffIndex}
            currentDiff={currentDiff}
            fillPercent={fillPercent}
            onDiffChange={setDiffIndex}
            onPlay={handlePlay}
          />

          {/* Card 3 — Profil */}
          <CardStatic
            data={STATIC_CARDS[1]!}
            onClick={() => onNavigate(STATIC_CARDS[1]!.onClickPath)}
          />

        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Styles partagés (border top permanente + hover glow)
// ─────────────────────────────────────────────

const CARD_BASE_CLASSES = `
  relative overflow-hidden
  bg-[hsl(var(--card))]
  rounded-lg p-7
  flex flex-col gap-5
  transition-all duration-300
  hover:-translate-y-1
`;

// Au repos : bordure 1px globale grise + bordure top colorée (2px)
// Au hover : bordure 1px colorée tout autour + glow projeté
function getCardBoxShadow(isHovered: boolean): string {
  if (isHovered) {
    return `
      0 0 0 1px hsl(var(--card-accent) / 0.5),
      0 20px 50px -12px hsl(var(--card-accent) / 0.35),
      inset 0 2px 0 0 hsl(var(--card-accent))
    `;
  }
  return `
    0 0 0 1px hsl(var(--border)),
    inset 0 2px 0 0 hsl(var(--card-accent))
  `;
}

// ─────────────────────────────────────────────
// Card Jouer (interactive avec slider)
// ─────────────────────────────────────────────

interface CardPlayProps {
  diffIndex: number;
  currentDiff: typeof DIFFICULTY_LEVELS[number];
  fillPercent: number;
  onDiffChange: (i: number) => void;
  onPlay: () => void;
}

function CardPlay({ diffIndex, currentDiff, fillPercent, onDiffChange, onPlay }: CardPlayProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group ${CARD_BASE_CLASSES}`}
      style={{
        ['--card-accent' as string]: 'var(--primary)',
        boxShadow: getCardBoxShadow(isHovered),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* <span
        className="absolute top-4 right-6 text-[7rem] font-extrabold leading-none opacity-[0.04] pointer-events-none select-none transition-opacity duration-300 group-hover:opacity-[0.08]"
        style={{ color: 'hsl(var(--card-accent))' }}
      >
        02
      </span> */}

      <div
        className="relative z-10 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{
          background: 'hsl(var(--card-accent) / 0.15)',
          color: 'hsl(var(--card-accent))',
        }}
      >
        <Play size={20} />
      </div>

      <div className="relative z-10 flex flex-col gap-2 flex-1">
        <span
          className="text-[0.65rem] uppercase tracking-[0.15em] font-medium"
          style={{ color: 'hsl(var(--card-accent))' }}
        >
          Partie
        </span>
        <div className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
          Jouer
        </div>
        <p className="text-sm text-[hsl(var(--foreground-secondary))] leading-relaxed">
          Lance une nouvelle partie contre des bots. Choisis la difficulté avant de jouer.
        </p>

        {/* Slider de difficulté avec remplissage progressif */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-between text-[0.7rem] font-medium">
            {DIFFICULTY_LEVELS.map((d, i) => (
              <span
                key={d.value}
                className="transition-all duration-1000"
                style={{
                  color: i === diffIndex
                    ? 'hsl(var(--card-accent))'
                    : 'hsl(var(--foreground-muted))',
                  fontWeight: i === diffIndex ? 800 : 400,
                }}
              >
                {d.label}
              </span>
            ))}
          </div>
       {/* Track custom */}
<div className="relative h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
  {/* Fill animé */}
  <div
    className="absolute top-0 left-0 h-full rounded-full"
    style={{
      width: `${fillPercent}%`,
      background: 'hsl(var(--card-accent))',
      transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
    }}
  />
  {/* Thumb custom */}
  <div
    className="absolute top-1/2 w-4 h-4 rounded-full pointer-events-none"
    style={{
      left: `${fillPercent}%`,
      transform: 'translate(-50%, -50%)',
      background: 'hsl(var(--card-accent))',
    //   boxShadow: '0 2px 8px hsl(var(--card-accent) / 0.4), 0 0 0 4px hsl(var(--card) )',
      transition: 'left 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
    }}
  />
  {/* Input invisible pour capter le drag */}
  <input
    type="range"
    min={0}
    max={2}
    step={1}
    value={diffIndex}
    onChange={(e) => onDiffChange(Number(e.target.value))}
    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
  />
</div>
          <p className="text-xs text-[hsl(var(--foreground-secondary))] leading-relaxed min-h-[2.5em]">
            {currentDiff.desc}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
        <button
          onClick={onPlay}
          className="
            inline-flex items-center gap-2
            text-[hsl(var(--primary-foreground))]
            px-4 py-2 rounded-md
            font-semibold text-sm
            hover:opacity-90
            transition-opacity
          "
          style={{ background: 'hsl(var(--card-accent))' }}
        >
          Lancer une partie
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Card statique (Règles, Profil)
// ─────────────────────────────────────────────

interface CardStaticProps {
  data: typeof STATIC_CARDS[number];
  onClick: () => void;
}

function CardStatic({ data, onClick }: CardStaticProps) {
  const Icon = data.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={data.href}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`group cursor-pointer no-underline ${CARD_BASE_CLASSES}`}
      style={{
        ['--card-accent' as string]: `var(${data.accentVar})`,
        boxShadow: getCardBoxShadow(isHovered),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* <span
        className="absolute top-4 right-6 text-[7rem] font-extrabold leading-none opacity-[0.04] pointer-events-none select-none transition-opacity duration-300 group-hover:opacity-[0.08]"
        style={{ color: 'hsl(var(--card-accent))' }}
      >
        {data.number}
      </span> */}

      <div
        className="relative z-10 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{
          background: 'hsl(var(--card-accent) / 0.15)',
          color: 'hsl(var(--card-accent))',
        }}
      >
        <Icon size={20} />
      </div>

      <div className="relative z-10 flex flex-col gap-2 flex-1">
        <span className="text-[0.65rem] uppercase tracking-[0.15em] font-medium text-[hsl(var(--foreground-muted))]" style={{ color: 'hsl(var(--card-accent))' }}>
            
          {data.tag}
        </span>
        <div className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
          {data.title}
        </div>
        <p className="text-sm text-[hsl(var(--foreground-secondary))] leading-relaxed">
          {data.description}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
        <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--foreground-muted))]">
          <Info size={11} />
          {data.footer}
        </span>
        <span style={{ color: 'hsl(var(--card-accent))' }}>
          <ArrowRight size={16} />
        </span>
      </div>
    </a>
  );
}