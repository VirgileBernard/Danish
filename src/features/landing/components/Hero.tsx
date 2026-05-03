import { Play, ArrowRight } from 'lucide-react';
import videoDwc from '../../../assets/DWC_V4.webm';

export function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-60px)] flex items-center py-20 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* COLONNE GAUCHE — TEXTE */}
          <div className="flex flex-col">

            {/* Eyebrow */}
            <div className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[hsl(var(--primary))] mb-7">
              Site Officiel · 2026
            </div>

            {/* Badge avec point pulsant */}
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 mb-8 rounded-full border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground-secondary))]">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              Tournoi incoming · Édition 2026
            </div>

            {/* Titre */}
            <h1
              className="font-display font-extrabold leading-[1.05] tracking-tight text-[hsl(var(--foreground))] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            >
              <span className="block">Danish</span>
              <span className="block bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
                World
              </span>
              <span className="block">Championship</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-[hsl(var(--foreground-secondary))] leading-relaxed mb-8 max-w-md">
              La plateforme officielle du tournoi de cartes annuel.
              Jeux, règles, classements — tout ce qu'il faut pour la prochaine édition.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/Danish/game"
                className="
                  inline-flex items-center gap-2
                  bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
                  px-5 py-3 rounded-md
                  font-semibold text-sm
                  hover:opacity-90 hover:-translate-y-0.5
                  transition-all
                  no-underline
                  shadow-lg shadow-[hsl(var(--primary)/0.25)]
                "
              >
        
                <Play size={16} fill="currentColor" />

                Jouer maintenant
              </a>
              <a
                href="#"
                className="
                  inline-flex items-center gap-2
                  bg-transparent text-[hsl(var(--foreground-secondary))]
                  px-5 py-3 rounded-md
                  border border-[hsl(var(--border))]
                  font-medium text-sm
                  hover:border-[hsl(var(--primary)/0.5)] hover:text-[hsl(var(--foreground))]
                  transition-colors
                  no-underline
                "
              >
                Voir les règles
                <ArrowRight size={14} />
              </a>
            </div>

          </div>

          {/* COLONNE DROITE — VIDÉO */}
          <div className="flex items-center justify-center order-first md:order-last">
            <div className="relative aspect-square w-full max-w-[480px] flex items-center justify-center">
              {/* Glow ring : utilise --glow-primary défini dans tokens.css */}
              <div
                className="absolute inset-0 rounded-full animate-pulse blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, hsl(var(--glow-primary)) 0%, hsl(var(--glow-accent)) 50%, transparent 70%)',
                }}
              />
              {/* Vidéo */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="relative z-10 w-[85%] h-[85%] object-contain"
              >
                <source src={videoDwc} type="video/webm" />
              </video>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
