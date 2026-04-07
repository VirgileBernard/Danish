import type { Card } from '@/features/game/utils/types';

// Explicit value map — every rank's game value as defined in the rules.
// 10 is 99 (always playable, cuts pile), 2 is 12 (strongest normal reset),
// 3 is 0 (copies previous card), 4 is 1 (weakest card).
const VALUE_MAP: Record<Card['rank'], number> = {
  '4': 1,
  '5': 2,
  '6': 3,
  '7': 4,
  '8': 5,
  '9': 6,
  'J': 8,
  'Q': 9,
  'K': 10,
  'A': 11,
  '2': 12,
  '3': 0,
  '10': 99,
};

// Special cards trigger unique effects — used by isValidPlay and applyPlay.
const SPECIAL_RANKS = new Set<Card['rank']>(['2', '3', '10', 'J', 'A']);

const SUIT_INITIALS: Record<Card['suit'], string> = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
};

const RANKS: Card['rank'][] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Returns a fresh, unshuffled 52-card deck.
 * Pure function — no mutation, no side effects.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${SUIT_INITIALS[suit]}`,
        rank,
        suit,
        value: VALUE_MAP[rank],
        isSpecial: SPECIAL_RANKS.has(rank),
      });
    }
  }

  return deck;
}
