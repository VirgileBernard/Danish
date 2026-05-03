import * as Cards from '@letele/playing-cards';
import type { Card } from '@/features/game/utils/types';
import logoBernitoCorp from '@/assets/logoBernitoCorp.svg';

// Maps our suit/rank to the @letele/playing-cards component name
function getCardComponentName(card: Card): string {
  const suitMap: Record<string, string> = {
    hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S',
  };
  const rankMap: Record<string, string> = {
    A: 'a', J: 'j', Q: 'q', K: 'k',
  };
  const suit = suitMap[card.suit];
  const rank = rankMap[card.rank] ?? card.rank;
  return `${suit}${rank}`;
}

type CardComponent = React.FC<React.SVGProps<SVGSVGElement>>;
const cardMap = Cards as unknown as Record<string, CardComponent>;

interface GameCardProps {
  card: Card | null;
  state?: 'normal' | 'selected' | 'optimal' | 'chosen' | 'hidden' | 'empty';
  onClick?: () => void;
  disabled?: boolean;
}

export function GameCard({ card, state = 'normal', onClick, disabled = false }: GameCardProps) {
  const ringClass =
    state === 'selected' ? 'ring-2 ring-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.5)]' :
    state === 'optimal'  ? 'ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]' :
    state === 'chosen'   ? 'ring-2 ring-amber-700 shadow-[0_0_12px_rgba(180,83,9,0.5)]' :
    '';

  const baseClass = 'w-16 h-[89px] rounded-md select-none flex-shrink-0 transition-all duration-150';
  const cursorClass = disabled
    ? 'opacity-50 cursor-not-allowed'
    : onClick
    ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg'
    : '';

  if (state === 'empty') {
    return (
      <div className={`${baseClass} border-2 border-dashed border-white/20 bg-white/5`} />
    );
  }

  if (state === 'hidden' || card === null) {
    return (
      <div
        className={`${baseClass} ${ringClass} ${cursorClass} relative overflow-hidden`}
        onClick={disabled ? undefined : onClick}
      >
        {/* Ivory cream background */}
        <div className="absolute inset-0 bg-[#e8dcc8] rounded-md" />
        {/* Inner vintage frame with diagonal hatch */}
        <div
          className="absolute inset-[3px] rounded-[5px] border border-[#c4a88266]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#c4a88218 0px,#c4a88218 2px,transparent 2px,transparent 8px)' }}
        />
        {/* Outer border */}
        <div className="absolute inset-0 rounded-md border border-[#c4a882]" />
        {/* Bernito Corp logo */}
        <img
          src={logoBernitoCorp}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 object-contain opacity-100 pointer-events-none"
        />
      </div>
    );
  }

  const name = getCardComponentName(card);
  const CardSvg = cardMap[name];

  if (!CardSvg) {
    return (
      <div className={`${baseClass} ${ringClass} ${cursorClass} bg-white/10 flex items-center justify-center text-xs text-white`}>
        {card.rank}
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} ${ringClass} ${cursorClass} overflow-hidden shadow-[0_2px_8px_rgba(100,70,30,0.25)]`}
      onClick={disabled ? undefined : onClick}
    >
      <CardSvg className="w-full h-full" />
    </div>
  );
}
