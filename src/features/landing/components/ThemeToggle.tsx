import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Basculer le thème"
      className="
        inline-flex items-center gap-2
        px-3.5 py-1.5
        rounded-full
        border border-[hsl(var(--border))]
        bg-[hsl(var(--card))]
        text-[hsl(var(--foreground))]
        text-xs font-medium tracking-wider uppercase
        transition-colors
        hover:border-[hsl(var(--primary))]
      "
    >
      <span
        className="
          flex items-center justify-center
          w-[22px] h-[22px]
          rounded-full
          bg-[hsl(var(--primary)/0.15)]
          text-[hsl(var(--primary))]
        "
      >
        {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
      </span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}