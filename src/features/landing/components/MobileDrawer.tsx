import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavLink {
  label: string;
  href: string;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
}

export function MobileDrawer({ isOpen, onClose, links }: MobileDrawerProps) {
  // Fermeture sur touche Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Bloquer le scroll du body pendant que le drawer est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // On render via portal directement dans body
  return createPortal(
    <>
      {/* Overlay sombre — clic dessus = fermer */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`
          fixed inset-0 z-[90]
          bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Drawer latéral droit */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        className={`
          fixed top-0 right-0 z-[100]
          h-full w-[280px] max-w-[85vw]
          bg-[hsl(var(--background))]
          border-l border-[hsl(var(--border))]
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header avec bouton de fermeture */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <span className="font-display font-extrabold text-base tracking-tight text-[hsl(var(--foreground))]">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="
              p-2 rounded-md
              text-[hsl(var(--foreground-secondary))]
              hover:bg-[hsl(var(--border)/0.4)]
              hover:text-[hsl(var(--foreground))]
              transition-colors
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* Liens de navigation */}
        <nav className="flex flex-col p-4 gap-1 flex-1">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="
                px-4 py-3 rounded-md
                text-[hsl(var(--foreground-secondary))]
                font-medium
                hover:bg-[hsl(var(--border)/0.4)]
                hover:text-[hsl(var(--foreground))]
                transition-colors
                no-underline
              "
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Footer avec actions (theme + login) */}
        <div className="flex flex-col gap-3 p-4 border-t border-[hsl(var(--border))]">
          <ThemeToggle />
          <a
            href="#"
            onClick={onClose}
            className="
              inline-flex items-center justify-center
              bg-[hsl(var(--primary))]
              text-[hsl(var(--primary-foreground))]
              text-sm font-semibold
              px-4 py-2.5 rounded-md
              hover:opacity-90
              transition-opacity
              no-underline
            "
          >
            Se connecter
          </a>
        </div>
      </aside>
    </>,
    document.body
  );
}