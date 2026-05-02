import { useState } from 'react';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MobileDrawer } from './MobileDrawer';
import logoDwc from '../../../assets/logo-DWCV1.png';

const NAV_LINKS = [
  { label: 'Règles', href: '#' },
  { label: 'Jouer', href: '#' },
  { label: 'Classement', href: '#' },
  { label: 'Profil', href: '#' },
];

export function Nav() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <nav
        className="
          sticky top-0 z-50
          bg-[hsl(var(--background)/0.8)] backdrop-blur-md
          border-b border-[hsl(var(--border)/0.5)]
        "
      >
        <div
          className="
            max-w-[1280px] mx-auto
            flex items-center justify-between
            px-8 py-3.5
          "
        >
          {/* BRAND */}
          <a href="#" className="flex items-center gap-2.5 no-underline">
            <img
              src={logoDwc}
              alt="Logo DWC"
              className="w-[30px] h-[30px] object-contain"
            />
            <span className="font-display font-extrabold text-base tracking-tight text-[hsl(var(--foreground))]">
              DWC
            </span>
          </a>

          {/* LIENS DESKTOP — cachés sur mobile */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="
                  text-sm font-medium
                  text-[hsl(var(--foreground-muted))]
                  hover:text-[hsl(var(--foreground))]
                  hover:bg-[hsl(var(--border)/0.4)]
                  px-3 py-2
                  rounded-md
                  transition-colors
                  no-underline
                "
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ACTIONS DESKTOP — cachées sur mobile */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#"
              className="
                bg-[hsl(var(--primary))]
                text-[hsl(var(--primary-foreground))]
                text-sm font-semibold
                px-4 py-2 rounded-md
                hover:opacity-90
                transition-opacity
                no-underline
              "
            >
              Se connecter
            </a>
          </div>

          {/* BURGER — visible uniquement sur mobile */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className="
              md:hidden
              p-2 rounded-md
              text-[hsl(var(--foreground))]
              hover:bg-[hsl(var(--border)/0.4)]
              transition-colors
            "
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* DRAWER MOBILE */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        links={NAV_LINKS}
      />
    </>
  );
}