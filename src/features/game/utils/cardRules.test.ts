import { describe, it, expect } from 'vitest';
import { isValidPlay, getEffectiveValue } from '@/features/game/utils/cardRules';
import { createDeck } from '@/features/game/utils/deck';
import type { Card, GameState, TurnContext, RulesConfig } from '@/features/game/utils/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const deck = createDeck();

/** Retrieve a card from the real deck — fails fast if rank/suit don't exist. */
function c(rank: Card['rank'], suit: Card['suit'] = 'hearts'): Card {
  const found = deck.find(card => card.rank === rank && card.suit === suit);
  if (!found) throw new Error(`Card not found: ${rank}${suit[0]}`);
  return found;
}

function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
  return {
    mustPlayDouble: false,
    mustFollowSuit: null,
    mustFollowAboveValue: null,
    mustPlayBelow7: false,
    lastEffectiveCard: null,
    consecutiveSameValue: 0,
    lastPlayedValue: null,
    skippedPlayers: 0,
    attackTarget: null,
    ...overrides,
  };
}

/**
 * Builds a minimal GameState.
 * @param pile     Cards currently on the pile (empty = pile was cut by 10 or game start).
 * @param context  TurnContext overrides — everything else defaults to "no active rule".
 * @param config   RulesConfig override — defaults to patriarchal.
 */
function makeState(
  pile: Card[] = [],
  context: Partial<TurnContext> = {},
  config: RulesConfig = { mode: 'patriarchal' },
): GameState {
  return {
    phase: 'PLAYING',
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    pile,
    discard: [],
    turnContext: makeContext(context),
    config,
    helperActive: false,
    validMoves: [],
    bestMove: null,
    emotes: [],
    finishOrder: [],
  };
}

// ── 2 ─────────────────────────────────────────────────────────────────────
// Value 12 — resets pile to 0, does NOT cut. Allowed under 7 rule.

describe('card 2', () => {
  it('valid — beats K (value 10) via default comparison', () => {
    const king = c('K');
    const state = makeState([king], { lastEffectiveCard: king });
    expect(isValidPlay([c('2')], state)).toBe(true);
  });

  it('invalid — wrong suit under mustFollowSuit (six rule)', () => {
    const sixH = c('6', 'hearts');
    // mustFollowSuit requires hearts; playing 2 of spades
    const state = makeState([sixH], { mustFollowSuit: 'hearts', lastEffectiveCard: sixH });
    expect(isValidPlay([c('2', 'spades')], state)).toBe(false);
  });
});

// ── 3 ─────────────────────────────────────────────────────────────────────
// Value 0 — copies previous card. Never gated by a value comparison on a
// non-empty pile. Allowed under 7 rule and as a single under Jack rule.

describe('card 3', () => {
  it('valid — copies Q on pile; 3 is not value-gated on a non-empty pile', () => {
    const queen = c('Q');
    const state = makeState([queen], { lastEffectiveCard: queen });
    expect(isValidPlay([c('3')], state)).toBe(true);
  });

  it('invalid — wrong suit blocks 3 under mustFollowSuit', () => {
    const sixH = c('6', 'hearts');
    // 3 of spades cannot follow hearts constraint
    const state = makeState([sixH], { mustFollowSuit: 'hearts', lastEffectiveCard: sixH });
    expect(isValidPlay([c('3', 'spades')], state)).toBe(false);
  });
});

// ── 4 ─────────────────────────────────────────────────────────────────────
// Value 1 — weakest card. Forbidden on an empty pile (after 10 cuts).
// OK after a 2 reset (pile still has the 2, lastEffectiveCard = null → effective 0).

describe('card 4', () => {
  it('valid — playable after 2 reset (pile not empty, effective value 0)', () => {
    const two = c('2');
    // Engine sets lastEffectiveCard = null after 2 to signal "effective value 0"
    const state = makeState([two], { lastEffectiveCard: null });
    expect(isValidPlay([c('4')], state)).toBe(true);
  });

  it('invalid — cannot open an empty pile (after 10 cut or game start)', () => {
    const state = makeState([]); // pile cut by 10
    expect(isValidPlay([c('4')], state)).toBe(false);
  });
});

// ── 6 ─────────────────────────────────────────────────────────────────────
// Value 3 — triggers mustFollowSuit for the NEXT player.
// Played like a normal card: must beat the current pile top.

describe('card 6', () => {
  it('valid — beats 5 (value 2) via default comparison', () => {
    const five = c('5');
    const state = makeState([five], { lastEffectiveCard: five });
    expect(isValidPlay([c('6')], state)).toBe(true);
  });

  it('invalid — cannot beat J (value 8)', () => {
    const jack = c('J');
    const state = makeState([jack], { lastEffectiveCard: jack });
    expect(isValidPlay([c('6')], state)).toBe(false);
  });
});

// ── 7 ─────────────────────────────────────────────────────────────────────
// Value 4 — triggers mustPlayBelow7 for the NEXT player.
// Played like a normal card: must beat the current pile top.

describe('card 7', () => {
  it('valid — beats 6 (value 3) via default comparison', () => {
    const six = c('6');
    const state = makeState([six], { lastEffectiveCard: six });
    expect(isValidPlay([c('7')], state)).toBe(true);
  });

  it('invalid — cannot beat 8 (value 5)', () => {
    const eight = c('8');
    const state = makeState([eight], { lastEffectiveCard: eight });
    expect(isValidPlay([c('7')], state)).toBe(false);
  });
});

// ── 8 ─────────────────────────────────────────────────────────────────────
// Value 5 — skips the next player. Playing N eights skips N players.
// Normal value comparison applies when determining if it can be played.

describe('card 8', () => {
  it('valid — beats 7 (value 4)', () => {
    const seven = c('7');
    const state = makeState([seven], { lastEffectiveCard: seven });
    expect(isValidPlay([c('8')], state)).toBe(true);
  });

  it('invalid — blocked by mustPlayBelow7 (face value 8 > 7)', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayBelow7: true, lastEffectiveCard: five });
    expect(isValidPlay([c('8')], state)).toBe(false);
  });
});

// ── 10 ────────────────────────────────────────────────────────────────────
// Value 99 — cuts the pile, overrides most constraints.
// Exceptions: invalid after a 7, and invalid after a 6 of a different suit.

describe('card 10', () => {
  it('invalid — blocked by mustPlayBelow7 (10 cannot follow a 7)', () => {
    const nine = c('9');
    const state = makeState([nine], { mustPlayBelow7: true, lastEffectiveCard: nine });
    expect(isValidPlay([c('10')], state)).toBe(false);
  });

  it('invalid — Q (non-10) blocked by the same mustPlayBelow7 constraint', () => {
    // Demonstrates the 7 rule blocks all high-value cards
    const five = c('5');
    const state = makeState([five], { mustPlayBelow7: true, lastEffectiveCard: five });
    expect(isValidPlay([c('Q')], state)).toBe(false);
  });

  it('valid — 10 of same suit after 6 of hearts', () => {
    const sixH = c('6', 'hearts');
    const state = makeState([sixH], {
      mustFollowSuit: 'hearts',
      mustFollowAboveValue: sixH.value,
      lastEffectiveCard: sixH,
    });
    expect(isValidPlay([c('10', 'hearts')], state)).toBe(true);
  });

  it('invalid — 10 of different suit after 6 of hearts', () => {
    const sixH = c('6', 'hearts');
    const state = makeState([sixH], {
      mustFollowSuit: 'hearts',
      mustFollowAboveValue: sixH.value,
      lastEffectiveCard: sixH,
    });
    expect(isValidPlay([c('10', 'spades')], state)).toBe(false);
  });
});

// ── J ─────────────────────────────────────────────────────────────────────
// Value 8 — triggers mustPlayDouble for the NEXT player.
// J itself is an exception: it may be played as a single under that same rule.

describe('card J', () => {
  it('valid — single J satisfies mustPlayDouble as a Jack exception', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('J')], state)).toBe(true);
  });

  it('invalid — single Q rejected under mustPlayDouble (not an exception)', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('Q')], state)).toBe(false);
  });
});

// ── A ─────────────────────────────────────────────────────────────────────
// Value 11 — attack card: targeted player risks taking the pile.
// Ace is explicitly forbidden under the 7 rule.

describe('card A', () => {
  it('valid — beats Q (value 9) via default comparison', () => {
    const queen = c('Q');
    const state = makeState([queen], { lastEffectiveCard: queen });
    expect(isValidPlay([c('A')], state)).toBe(true);
  });

  it('invalid — Ace explicitly blocked by mustPlayBelow7', () => {
    const four = c('4');
    const state = makeState([four], { mustPlayBelow7: true, lastEffectiveCard: four });
    expect(isValidPlay([c('A')], state)).toBe(false);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────

describe('isValidPlay — edge cases', () => {
  it('rejects empty card array', () => {
    expect(isValidPlay([], makeState())).toBe(false);
  });

  it('rejects mixed-rank arrays (not all same rank)', () => {
    const state = makeState([c('5')], { lastEffectiveCard: c('5') });
    expect(isValidPlay([c('K'), c('Q')], state)).toBe(false);
  });

  it('valid — two Ks played as pair under mustPlayDouble', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('K', 'hearts'), c('K', 'spades')], state)).toBe(true);
  });

  it('valid — 10 beats a pile topped by 2 (value 12, normally unbeatable)', () => {
    const two = c('2');
    // 2 has value 12 — no normal card can beat it, but 10 always can
    const state = makeState([two], { lastEffectiveCard: two });
    expect(isValidPlay([c('10')], state)).toBe(true);
  });

  it('valid — equal value card is allowed (>= comparison)', () => {
    const eight = c('8');
    const state = makeState([eight], { lastEffectiveCard: eight });
    // 8 has value 5; playing another 8 (value 5) must be valid
    expect(isValidPlay([c('8', 'spades')], state)).toBe(true);
  });
});

// ── Six rule — special cards ───────────────────────────────────────────────

describe('six rule — special card interactions', () => {
  const sixH = (() => {
    const found = deck.find(card => card.rank === '6' && card.suit === 'hearts');
    if (!found) throw new Error('6h not found');
    return found;
  })();

  function sixState(overrides: Partial<TurnContext> = {}) {
    return makeState([sixH], {
      mustFollowSuit: 'hearts',
      mustFollowAboveValue: sixH.value,
      lastEffectiveCard: sixH,
      ...overrides,
    });
  }

  it('valid — 2 of same suit after 6', () => {
    expect(isValidPlay([c('2', 'hearts')], sixState())).toBe(true);
  });

  it('invalid — 2 of different suit after 6', () => {
    expect(isValidPlay([c('2', 'spades')], sixState())).toBe(false);
  });

  it('valid — 3 of same suit after 6', () => {
    expect(isValidPlay([c('3', 'hearts')], sixState())).toBe(true);
  });

  it('invalid — 3 of different suit after 6', () => {
    expect(isValidPlay([c('3', 'spades')], sixState())).toBe(false);
  });

  it('valid — another 6 of any suit after 6', () => {
    expect(isValidPlay([c('6', 'spades')], sixState())).toBe(true);
  });
});

// ── RulesConfig — Q/K value modes ─────────────────────────────────────────

describe('getEffectiveValue — patriarchal vs matriarchal', () => {
  it('patriarchal: K has effective value 10', () => {
    expect(getEffectiveValue(c('K'), { mode: 'patriarchal' })).toBe(10);
  });

  it('patriarchal: Q has effective value 9', () => {
    expect(getEffectiveValue(c('Q'), { mode: 'patriarchal' })).toBe(9);
  });

  it('matriarchal: Q has effective value 10', () => {
    expect(getEffectiveValue(c('Q'), { mode: 'matriarchal' })).toBe(10);
  });

  it('matriarchal: K has effective value 9', () => {
    expect(getEffectiveValue(c('K'), { mode: 'matriarchal' })).toBe(9);
  });

  it('patriarchal: playing Q (9) on K (10) is invalid', () => {
    const king = c('K');
    const state = makeState([king], { lastEffectiveCard: king }, { mode: 'patriarchal' });
    expect(isValidPlay([c('Q')], state)).toBe(false);
  });

  it('matriarchal: playing Q (10) on K (9) is valid', () => {
    const king = c('K');
    const state = makeState([king], { lastEffectiveCard: king }, { mode: 'matriarchal' });
    expect(isValidPlay([c('Q')], state)).toBe(true);
  });
});

// ── 4-of-a-kind — isValidPlay does not block the 4th play ─────────────────

describe('4-of-a-kind auto-cut', () => {
  it('valid — 4th consecutive same-value card is not blocked by isValidPlay', () => {
    // consecutiveSameValue tracks the count; the cut is applied in applyPlay, not here.
    const seven = c('7');
    const state = makeState([seven], {
      lastEffectiveCard: seven,
      consecutiveSameValue: 3,
      lastPlayedValue: seven.value,
    });
    expect(isValidPlay([c('7', 'spades')], state)).toBe(true);
  });
});
