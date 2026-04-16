import { describe, it, expect } from 'vitest';
import { isValidPlay, getEffectiveValue, applyPlay, getValidMoves, getBestMove, initGame } from '@/features/game/utils/cardRules';
import { createDeck } from '@/features/game/utils/deck';
import type { Card, GameState, Player, TurnContext, RulesConfig } from '@/features/game/utils/types';

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
// non-empty pile. Allowed under 7 rule. Under Jack rule, must be played as a
// double — single 3 is NOT a Jack exception (BUG 1 fix).

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

  // BUG 1: 2 and 3 are no longer single-card Jack exceptions
  it('invalid — single 2 under mustPlayDouble (only J is a single-card exception)', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('2')], state)).toBe(false);
  });

  it('invalid — single 3 under mustPlayDouble (only J is a single-card exception)', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('3')], state)).toBe(false);
  });

  it('valid — pair of 2s satisfies mustPlayDouble', () => {
    const five = c('5');
    const state = makeState([five], { mustPlayDouble: true, lastEffectiveCard: five });
    expect(isValidPlay([c('2', 'hearts'), c('2', 'spades')], state)).toBe(true);
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

// ══════════════════════════════════════════════════════════════════════════════
// applyPlay
// ══════════════════════════════════════════════════════════════════════════════

// ── applyPlay helpers ──────────────────────────────────────────────────────

function makePlayer(
  id: string,
  hand: Card[],
  visible: Card[] = [],
  hidden: Card[] = [],
): Player {
  return {
    id,
    name: id,
    title: '',
    isBot: false,
    isReady: true,
    isFinished: false,
    hand,
    visibleCards: visible,
    hiddenCards: hidden,
    stats: { gamesPlayed: 0, placements: [0, 0, 0, 0], achievements: [] },
  };
}

/**
 * Builds a GameState suitable for applyPlay tests.
 * Accepts full player list, current player index, and optional overrides.
 */
function makeApplyState(
  players: Player[],
  currentPlayerIndex: number,
  opts: {
    pile?: Card[];
    deck?: Card[];
    discard?: Card[];
    context?: Partial<TurnContext>;
    config?: RulesConfig;
  } = {},
): GameState {
  return {
    phase: 'PLAYING',
    players,
    currentPlayerIndex,
    deck: opts.deck ?? [],
    pile: opts.pile ?? [],
    discard: opts.discard ?? [],
    turnContext: makeContext(opts.context ?? {}),
    config: opts.config ?? { mode: 'patriarchal' },
    helperActive: false,
    validMoves: [],
    bestMove: null,
    emotes: [],
    finishOrder: [],
  };
}

// ── Normal play ────────────────────────────────────────────────────────────

describe('applyPlay — normal play', () => {
  it('pile grows after a normal play', () => {
    const four = c('4', 'hearts');
    const five = c('5', 'hearts');
    const p0 = makePlayer('p0', [five, c('6', 'hearts'), c('7', 'hearts')]);
    const p1 = makePlayer('p1', [c('8', 'spades'), c('9', 'spades'), c('Q', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [four], context: { lastEffectiveCard: four } });
    const next = applyPlay([five], null, state);
    expect(next.pile).toHaveLength(2);
    expect(next.pile[1].id).toBe(five.id);
  });

  it('advances to next player after a normal play', () => {
    const four = c('4', 'hearts');
    const five = c('5', 'hearts');
    const p0 = makePlayer('p0', [five, c('6', 'hearts'), c('7', 'hearts')]);
    const p1 = makePlayer('p1', [c('8', 'spades'), c('9', 'spades'), c('Q', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [four], context: { lastEffectiveCard: four } });
    const next = applyPlay([five], null, state);
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('hand shrinks after playing from hand', () => {
    const four = c('4', 'hearts');
    const five = c('5', 'hearts');
    // 4 cards in hand, no deck — plays one, ends up with 3 (no replenishment possible)
    const p0 = makePlayer('p0', [five, c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts')]);
    const p1 = makePlayer('p1', [c('9', 'spades'), c('Q', 'spades'), c('K', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [four], context: { lastEffectiveCard: four } });
    const next = applyPlay([five], null, state);
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.players[0].hand.some(h => h.id === five.id)).toBe(false);
  });

  it('hand replenishes from deck after playing', () => {
    const four = c('4', 'hearts');
    const five = c('5', 'hearts');
    // Player has 2 cards; deck has 3; after playing 1 → 1 left, draws 2 → 3 total
    const p0 = makePlayer('p0', [five, c('6', 'hearts')]);
    const p1 = makePlayer('p1', [c('9', 'spades'), c('Q', 'spades'), c('K', 'spades')]);
    const deckCards = [c('7', 'diamonds'), c('8', 'diamonds'), c('9', 'diamonds')];
    const state = makeApplyState([p0, p1], 0, {
      pile: [four],
      deck: deckCards,
      context: { lastEffectiveCard: four },
    });
    const next = applyPlay([five], null, state);
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.deck).toHaveLength(1); // drew 2, 1 remains
  });

  it('hand does not replenish beyond 3 cards', () => {
    const four = c('4', 'hearts');
    const five = c('5', 'hearts');
    // Player has 4 — plays 1, already at 3, deck untouched
    const p0 = makePlayer('p0', [five, c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts')]);
    const p1 = makePlayer('p1', [c('9', 'spades'), c('Q', 'spades'), c('K', 'spades')]);
    const deckCards = [c('A', 'diamonds'), c('2', 'diamonds'), c('3', 'diamonds')];
    const state = makeApplyState([p0, p1], 0, {
      pile: [four],
      deck: deckCards,
      context: { lastEffectiveCard: four },
    });
    const next = applyPlay([five], null, state);
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.deck).toHaveLength(3); // deck untouched
  });

  it('visible card removed when played (visible zone, not hand)', () => {
    const six = c('6', 'hearts');
    const seven = c('7', 'spades'); // from visible
    // Player has no hand, 1 visible card
    const p0 = makePlayer('p0', [], [seven]);
    const p1 = makePlayer('p1', [c('8', 'clubs'), c('9', 'clubs'), c('Q', 'clubs')]);
    const state = makeApplyState([p0, p1], 0, { pile: [six], context: { lastEffectiveCard: six } });
    const next = applyPlay([seven], null, state);
    expect(next.players[0].visibleCards).toHaveLength(0);
    expect(next.players[0].hand).toHaveLength(0); // no deck to draw from
  });
});

// ── Card 10 (cut) ──────────────────────────────────────────────────────────

describe('applyPlay — card 10', () => {
  it('moves pile to discard', () => {
    const king = c('K', 'hearts');
    const ten = c('10', 'hearts');
    const p0 = makePlayer('p0', [ten, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const state = makeApplyState([p0, p1], 0, {
      pile: [king],
      context: { lastEffectiveCard: king },
    });
    const next = applyPlay([ten], null, state);
    expect(next.pile).toHaveLength(0);
    expect(next.discard).toHaveLength(2); // king + ten
  });

  it('same player plays again after 10', () => {
    const king = c('K', 'hearts');
    const ten = c('10', 'hearts');
    const p0 = makePlayer('p0', [ten, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const state = makeApplyState([p0, p1], 0, {
      pile: [king],
      context: { lastEffectiveCard: king },
    });
    const next = applyPlay([ten], null, state);
    expect(next.currentPlayerIndex).toBe(0);
  });

  it('clears all context flags after 10', () => {
    const king = c('K', 'hearts');
    const ten = c('10', 'hearts');
    const p0 = makePlayer('p0', [ten, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const state = makeApplyState([p0, p1], 0, {
      pile: [king],
      context: { mustPlayBelow7: true, lastEffectiveCard: king },
    });
    const next = applyPlay([ten], null, state);
    expect(next.turnContext.mustPlayBelow7).toBe(false);
    expect(next.turnContext.lastEffectiveCard).toBeNull();
  });
});

// ── Card 2 ─────────────────────────────────────────────────────────────────

describe('applyPlay — card 2', () => {
  it('clears lastEffectiveCard without cutting the pile', () => {
    const king = c('K', 'hearts');
    const two = c('2', 'hearts');
    const p0 = makePlayer('p0', [two, c('3', 'hearts'), c('4', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [king], context: { lastEffectiveCard: king } });
    const next = applyPlay([two], null, state);
    expect(next.pile.length).toBeGreaterThan(0); // pile stays — 2 does NOT cut
    expect(next.turnContext.lastEffectiveCard).toBeNull();
  });
});

// ── Card 7 ─────────────────────────────────────────────────────────────────

describe('applyPlay — card 7', () => {
  it('sets mustPlayBelow7 for the next player', () => {
    const six = c('6', 'hearts');
    const seven = c('7', 'hearts');
    const p0 = makePlayer('p0', [seven, c('8', 'hearts'), c('9', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('Q', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [six], context: { lastEffectiveCard: six } });
    const next = applyPlay([seven], null, state);
    expect(next.turnContext.mustPlayBelow7).toBe(true);
    expect(next.currentPlayerIndex).toBe(1);
  });
});

// ── Card J ─────────────────────────────────────────────────────────────────

describe('applyPlay — card J', () => {
  it('sets mustPlayDouble for the next player', () => {
    const nine = c('9', 'hearts');
    const jack = c('J', 'hearts');
    const p0 = makePlayer('p0', [jack, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [nine], context: { lastEffectiveCard: nine } });
    const next = applyPlay([jack], null, state);
    expect(next.turnContext.mustPlayDouble).toBe(true);
    expect(next.currentPlayerIndex).toBe(1);
  });
});

// ── Card 6 ─────────────────────────────────────────────────────────────────

describe('applyPlay — card 6', () => {
  it('sets mustFollowSuit and mustFollowAboveValue for the next player', () => {
    const five = c('5', 'hearts');
    const six = c('6', 'diamonds');
    const p0 = makePlayer('p0', [six, c('7', 'hearts'), c('8', 'hearts')]);
    const p1 = makePlayer('p1', [c('9', 'spades'), c('Q', 'spades'), c('K', 'spades')]);
    const state = makeApplyState([p0, p1], 0, { pile: [five], context: { lastEffectiveCard: five } });
    const next = applyPlay([six], null, state);
    expect(next.turnContext.mustFollowSuit).toBe('diamonds');
    expect(next.turnContext.mustFollowAboveValue).toBe(six.value); // value 3
    expect(next.currentPlayerIndex).toBe(1);
  });
});

// ── Card 3 — effect propagation ────────────────────────────────────────────

describe('applyPlay — card 3 mirrors full effect of previous card', () => {
  // Case A: 3 after 8 → skips next player (skippedPlayers: 1 + advancement)
  it('Case A — 3 after 8 sets skippedPlayers: 1 and skips the next player', () => {
    const eight = c('8', 'hearts');
    const three = c('3', 'hearts');
    const p0 = makePlayer('p0', [eight, c('5', 'hearts'), c('6', 'hearts')]);
    const p1 = makePlayer('p1', [three, c('5', 'spades'), c('6', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const p3 = makePlayer('p3', [c('Q', 'diamonds'), c('K', 'diamonds'), c('A', 'diamonds')]);
    // p1 plays 3 after the 8 that p0 played
    const state = makeApplyState([p0, p1, p2, p3], 1, {
      pile: [eight],
      context: { lastEffectiveCard: eight },
    });
    const next = applyPlay([three], null, state);
    expect(next.turnContext.skippedPlayers).toBe(1);
    // p2 (index 2) is skipped; turn goes to p3 (index 3)
    expect(next.currentPlayerIndex).toBe(3);
  });

  // Case B: 3 after J → mustPlayDouble propagated to next player
  // NB: single 3 under mustPlayDouble is invalid after BUG 1 fix; applyPlay does not
  // validate — this test exercises context propagation only (use a pair in real gameplay).
  it('Case B — 3 after J propagates mustPlayDouble to next player', () => {
    const jack = c('J', 'hearts');
    const three = c('3', 'hearts');
    const p0 = makePlayer('p0', [jack, c('5', 'hearts'), c('6', 'hearts')]);
    const p1 = makePlayer('p1', [three, c('5', 'spades'), c('6', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 1, {
      pile: [jack],
      context: { mustPlayDouble: true, lastEffectiveCard: jack },
    });
    const next = applyPlay([three], null, state);
    expect(next.turnContext.mustPlayDouble).toBe(true);
    expect(next.currentPlayerIndex).toBe(2);
  });

  // Case C: 3 after 6 → mustFollowSuit and mustFollowAboveValue propagated
  it('Case C — 3 after 6 propagates suit constraint', () => {
    const sixH = c('6', 'hearts');
    const threeH = c('3', 'hearts');
    const p0 = makePlayer('p0', [sixH, c('7', 'hearts'), c('8', 'hearts')]);
    const p1 = makePlayer('p1', [threeH, c('5', 'spades'), c('6', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 1, {
      pile: [sixH],
      context: {
        mustFollowSuit: 'hearts',
        mustFollowAboveValue: sixH.value,
        lastEffectiveCard: sixH,
      },
    });
    const next = applyPlay([threeH], null, state);
    expect(next.turnContext.mustFollowSuit).toBe('hearts');
    expect(next.turnContext.mustFollowAboveValue).toBe(sixH.value);
    expect(next.currentPlayerIndex).toBe(2);
  });

  // Case D: 3 after 7 → mustPlayBelow7 propagated; next player's valid moves are ≤7 only
  it('Case D — 3 after 7 propagates mustPlayBelow7; getValidMoves excludes high-value cards', () => {
    const seven = c('7', 'hearts');
    const three = c('3', 'hearts');
    const p0 = makePlayer('p0', [seven, c('8', 'hearts'), c('9', 'hearts')]);
    const p1 = makePlayer('p1', [three, c('5', 'spades'), c('6', 'spades')]);
    const p2 = makePlayer('p2', [c('8', 'clubs'), c('9', 'clubs'), c('K', 'clubs'), c('2', 'clubs'), c('5', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 1, {
      pile: [seven],
      context: { mustPlayBelow7: true, lastEffectiveCard: seven },
    });
    const next = applyPlay([three], null, state);
    expect(next.turnContext.mustPlayBelow7).toBe(true);
    expect(next.currentPlayerIndex).toBe(2);
    const validRanks = getValidMoves(next.players[2]!, next).map(card => card.rank);
    expect(validRanks).toContain('2');
    expect(validRanks).toContain('5');
    expect(validRanks).not.toContain('8');
    expect(validRanks).not.toContain('9');
    expect(validRanks).not.toContain('K');
  });

  // 2x3 under Jack: satisfies mustPlayDouble AND propagates it to next player
  it('2x3 under Jack — satisfies double obligation and propagates mustPlayDouble', () => {
    const jack = c('J', 'hearts');
    const three1 = c('3', 'hearts');
    const three2 = c('3', 'spades');
    const p0 = makePlayer('p0', [jack, c('5', 'hearts'), c('6', 'hearts')]);
    const p1 = makePlayer('p1', [three1, three2, c('5', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 1, {
      pile: [jack],
      context: { mustPlayDouble: true, lastEffectiveCard: jack },
    });
    const next = applyPlay([three1, three2], null, state);
    expect(next.turnContext.mustPlayDouble).toBe(true);
    expect(next.currentPlayerIndex).toBe(2);
  });
});

// ── Card 8 ─────────────────────────────────────────────────────────────────

describe('applyPlay — card 8', () => {
  it('single 8 skips next player', () => {
    const seven = c('7', 'hearts');
    const eight = c('8', 'hearts');
    const p0 = makePlayer('p0', [eight, c('9', 'hearts'), c('Q', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 0, { pile: [seven], context: { lastEffectiveCard: seven } });
    const next = applyPlay([eight], null, state);
    // skip p1, land on p2
    expect(next.currentPlayerIndex).toBe(2);
    expect(next.turnContext.skippedPlayers).toBe(1);
  });

  it('two 8s skip 2 players', () => {
    const seven = c('7', 'hearts');
    const eight1 = c('8', 'hearts');
    const eight2 = c('8', 'spades');
    const p0 = makePlayer('p0', [eight1, eight2, c('9', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const p3 = makePlayer('p3', [c('Q', 'diamonds'), c('K', 'diamonds'), c('A', 'diamonds')]);
    const state = makeApplyState([p0, p1, p2, p3], 0, {
      pile: [seven],
      context: { lastEffectiveCard: seven },
    });
    const next = applyPlay([eight1, eight2], null, state);
    // skip p1 and p2, land on p3
    expect(next.currentPlayerIndex).toBe(3);
    expect(next.turnContext.skippedPlayers).toBe(2);
  });
});

// ── Card A ─────────────────────────────────────────────────────────────────

describe('applyPlay — card A', () => {
  it('sets attackTarget in context', () => {
    const queen = c('Q', 'hearts');
    const ace = c('A', 'hearts');
    const p0 = makePlayer('p0', [ace, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 0, { pile: [queen], context: { lastEffectiveCard: queen } });
    const next = applyPlay([ace], 'p2', state);
    expect(next.turnContext.attackTarget).toBe('p2');
  });

  it('advances turn to the attacked player', () => {
    const queen = c('Q', 'hearts');
    const ace = c('A', 'hearts');
    const p0 = makePlayer('p0', [ace, c('2', 'hearts'), c('3', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('7', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);
    const state = makeApplyState([p0, p1, p2], 0, { pile: [queen], context: { lastEffectiveCard: queen } });
    const next = applyPlay([ace], 'p2', state);
    expect(next.currentPlayerIndex).toBe(2); // p2 is at index 2
  });
});

// ── 3 mirrors Ace ─────────────────────────────────────────────────────────

describe('applyPlay — 3 after A', () => {
  it('turn redirects to targetId chosen by the player who played the 3, not the original attack target', () => {
    // p0 plays A targeting p1 → p1 must play
    const ace = c('A', 'hearts');
    const three = c('3', 'hearts');
    const p0 = makePlayer('p0', [c('5', 'hearts'), c('6', 'hearts'), c('7', 'hearts')]);
    const p1 = makePlayer('p1', [three, c('9', 'spades'), c('Q', 'spades')]);
    const p2 = makePlayer('p2', [c('4', 'clubs'), c('5', 'clubs'), c('6', 'clubs')]);

    // State after p0 played A targeting p1: it's p1's turn
    const state = makeApplyState([p0, p1, p2], 1, {
      pile: [ace],
      context: { lastEffectiveCard: ace, attackTarget: 'p1' },
    });

    // p1 plays 3 (mirrors Ace) and chooses p2 as target
    const next = applyPlay([three], 'p2', state);

    expect(next.currentPlayerIndex).toBe(2); // p2, not p1
    expect(next.turnContext.attackTarget).toBe('p2');
  });
});

// ── 4-of-a-kind ────────────────────────────────────────────────────────────

describe('applyPlay — 4-of-a-kind auto-cut', () => {
  it('triggers auto-cut when 4th consecutive same-value card is played', () => {
    const seven = c('7', 'spades'); // 4th seven
    const p0 = makePlayer('p0', [seven, c('9', 'hearts'), c('Q', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('8', 'spades')]);
    // Pile contains 3 sevens already played
    const pile = [c('7', 'hearts'), c('7', 'diamonds'), c('7', 'clubs')];
    const state = makeApplyState([p0, p1], 0, {
      pile,
      context: {
        lastEffectiveCard: c('7', 'clubs'),
        consecutiveSameValue: 3,
        lastPlayedValue: c('7').value, // 4
      },
    });
    const next = applyPlay([seven], null, state);
    expect(next.pile).toHaveLength(0); // auto-cut, pile cleared
    expect(next.discard.length).toBe(4); // all four sevens moved to discard
    expect(next.turnContext.consecutiveSameValue).toBe(0); // reset
  });

  it('same player plays again after auto-cut', () => {
    const seven = c('7', 'spades');
    const p0 = makePlayer('p0', [seven, c('9', 'hearts'), c('Q', 'hearts')]);
    const p1 = makePlayer('p1', [c('5', 'spades'), c('6', 'spades'), c('8', 'spades')]);
    const pile = [c('7', 'hearts'), c('7', 'diamonds'), c('7', 'clubs')];
    const state = makeApplyState([p0, p1], 0, {
      pile,
      context: {
        lastEffectiveCard: c('7', 'clubs'),
        consecutiveSameValue: 3,
        lastPlayedValue: c('7').value,
      },
    });
    const next = applyPlay([seven], null, state);
    expect(next.currentPlayerIndex).toBe(0); // same player goes again
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getValidMoves
// ══════════════════════════════════════════════════════════════════════════════

describe('getValidMoves — zone selection', () => {
  it('uses hand when hand is not empty', () => {
    // Player has a 5 in hand and a K in visible — pile is empty, K valid on empty, 5 valid
    const five = c('5', 'hearts');
    const king = c('K', 'spades');
    const player = makePlayer('p0', [five], [king]);
    const state = makeState([]); // empty pile
    const moves = getValidMoves(player, state);
    // Only hand zone is searched; 5 is valid on empty pile (not rank '4')
    expect(moves.some(m => m.rank === '5')).toBe(true);
    expect(moves.some(m => m.rank === 'K')).toBe(false);
  });

  it('uses visibleCards when hand is empty', () => {
    const six = c('6', 'hearts');
    const seven = c('7', 'spades');
    // hand empty, visible has a 7
    const player = makePlayer('p0', [], [seven]);
    const state = makeState([six], { lastEffectiveCard: six });
    const moves = getValidMoves(player, state);
    expect(moves.some(m => m.rank === '7')).toBe(true);
  });

  it('uses hiddenCards when hand and visible are both empty', () => {
    const six = c('6', 'hearts');
    const nine = c('9', 'clubs');
    const player = makePlayer('p0', [], [], [nine]);
    const state = makeState([six], { lastEffectiveCard: six });
    const moves = getValidMoves(player, state);
    expect(moves.some(m => m.rank === '9')).toBe(true);
  });
});

describe('getValidMoves — validity filtering', () => {
  it('returns only cards that pass isValidPlay', () => {
    // mustPlayBelow7: only ranks ≤7 valid. Player has A (invalid) and 5 (valid).
    const five = c('5', 'hearts');
    const ace = c('A', 'hearts');
    const pile = [c('4', 'diamonds')];
    const player = makePlayer('p0', [ace, five]);
    const state = makeState(pile, { mustPlayBelow7: true, lastEffectiveCard: pile[0] });
    const moves = getValidMoves(player, state);
    expect(moves).toHaveLength(1);
    expect(moves[0].rank).toBe('5');
  });

  it('returns empty array when no card is playable', () => {
    // mustPlayBelow7, player only has A and K
    const player = makePlayer('p0', [c('A', 'hearts'), c('K', 'hearts')]);
    const pile = [c('5', 'diamonds')];
    const state = makeState(pile, { mustPlayBelow7: true, lastEffectiveCard: pile[0] });
    expect(getValidMoves(player, state)).toHaveLength(0);
  });

  it('deduplicates by rank — two 7s yield one entry', () => {
    const sevenH = c('7', 'hearts');
    const sevenS = c('7', 'spades');
    const pile = [c('6', 'diamonds')];
    const player = makePlayer('p0', [sevenH, sevenS]);
    const state = makeState(pile, { lastEffectiveCard: pile[0] });
    const moves = getValidMoves(player, state);
    // Both 7s are valid singles; deduplicated to one representative
    const sevens = moves.filter(m => m.rank === '7');
    expect(sevens).toHaveLength(1);
  });

  it('includes a rank when only a pair (not single) is valid — mustPlayDouble', () => {
    // Under Jack rule, a single 7 is blocked but a pair of 7s is valid
    const sevenH = c('7', 'hearts');
    const sevenS = c('7', 'spades');
    const pile = [c('J', 'diamonds')];
    const player = makePlayer('p0', [sevenH, sevenS]);
    const state = makeState(pile, { mustPlayDouble: true, lastEffectiveCard: pile[0] });
    const moves = getValidMoves(player, state);
    // Single 7 alone would fail mustPlayDouble, but the pair is valid
    expect(moves.some(m => m.rank === '7')).toBe(true);
  });

  it('excludes a rank when neither single nor pair is valid', () => {
    // Under mustPlayBelow7, player has K (invalid) and Q (invalid)
    const player = makePlayer('p0', [c('K', 'hearts'), c('Q', 'spades')]);
    const pile = [c('5', 'diamonds')];
    const state = makeState(pile, { mustPlayBelow7: true, lastEffectiveCard: pile[0] });
    expect(getValidMoves(player, state)).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getBestMove
// ══════════════════════════════════════════════════════════════════════════════

describe('getBestMove — heuristic', () => {
  it('returns null when no valid moves exist', () => {
    const player = makePlayer('p0', [c('A', 'hearts'), c('K', 'hearts')]);
    const pile = [c('5', 'diamonds')];
    const state = makeState(pile, { mustPlayBelow7: true, lastEffectiveCard: pile[0] });
    expect(getBestMove(player, state)).toBeNull();
  });

  it('conserves 10 when a normal card is also valid', () => {
    const five = c('5', 'hearts');
    const ten = c('10', 'hearts');
    const pile = [c('4', 'diamonds')];
    const player = makePlayer('p0', [ten, five]);
    const state = makeState(pile, { lastEffectiveCard: pile[0] });
    const best = getBestMove(player, state);
    expect(best?.rank).toBe('5'); // not 10
  });

  it('conserves 2 when a normal card is also valid', () => {
    const nine = c('9', 'hearts');
    const two = c('2', 'hearts');
    const pile = [c('8', 'diamonds')];
    const player = makePlayer('p0', [two, nine]);
    const state = makeState(pile, { lastEffectiveCard: pile[0] });
    const best = getBestMove(player, state);
    expect(best?.rank).toBe('9'); // not 2
  });

  it('picks the weakest valid normal card', () => {
    const five = c('5', 'hearts');
    const nine = c('9', 'hearts');
    const pile = [c('4', 'diamonds')];
    const player = makePlayer('p0', [nine, five]); // nine listed first, but 5 is weaker
    const state = makeState(pile, { lastEffectiveCard: pile[0] });
    const best = getBestMove(player, state);
    expect(best?.rank).toBe('5'); // value 2 < value 6
  });

  it('falls back to 10 when only specials are valid', () => {
    // Under mustPlayBelow7, nothing except the allowed specials can play.
    // Give player only 10 (blocked by mustPlayBelow7!) and 2.
    // Wait — 10 IS blocked by mustPlayBelow7 per our rules.
    // So let's test without mustPlayBelow7: pile has A (value 11),
    // only 2 (value 12) and 10 (value 99) beat it normally.
    const ace = c('A', 'diamonds');
    const two = c('2', 'hearts');
    const ten = c('10', 'hearts');
    const player = makePlayer('p0', [two, ten]);
    const state = makeState([ace], { lastEffectiveCard: ace });
    const best = getBestMove(player, state);
    // Both 2 and 10 are valid (2 value 12 >= 11, 10 always valid).
    // Neither is a normal card — fall back: 10 returned before 2.
    expect(best?.rank).toBe('10');
  });

  it('falls back to 2 when only 2 is valid', () => {
    const aceH = c('A', 'hearts');
    const two = c('2', 'hearts');
    const player = makePlayer('p0', [two]);
    const state = makeState([aceH], { lastEffectiveCard: aceH });
    const best = getBestMove(player, state);
    expect(best?.rank).toBe('2');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// initGame
// ══════════════════════════════════════════════════════════════════════════════

function barePlayer(id: string): Player {
  return {
    id,
    name: id,
    title: '',
    isBot: false,
    isReady: false,
    isFinished: false,
    hand: [],
    visibleCards: [],
    hiddenCards: [],
    stats: { gamesPlayed: 0, placements: [0, 0, 0, 0], achievements: [] },
  };
}

describe('initGame', () => {
  it('sets phase to PREPARATION', () => {
    const state = initGame([barePlayer('p0'), barePlayer('p1')], { mode: 'patriarchal' });
    expect(state.phase).toBe('PREPARATION');
  });

  it('deals exactly 9 cards per player (3 hidden + 3 visible + 3 hand)', () => {
    const state = initGame(
      [barePlayer('p0'), barePlayer('p1'), barePlayer('p2')],
      { mode: 'patriarchal' },
    );
    for (const player of state.players) {
      const total = player.hand.length + player.visibleCards.length + player.hiddenCards.length;
      expect(total).toBe(9);
      expect(player.hand).toHaveLength(3);
      expect(player.visibleCards).toHaveLength(3);
      expect(player.hiddenCards).toHaveLength(3);
    }
  });

  it('leaves correct number of cards in deck (52 − n×9)', () => {
    const n = 4;
    const state = initGame(
      Array.from({ length: n }, (_, i) => barePlayer(`p${i}`)),
      { mode: 'patriarchal' },
    );
    expect(state.deck).toHaveLength(52 - n * 9); // 52 − 36 = 16
  });

  it('deck + all player cards account for all 52 cards (no duplicates)', () => {
    const state = initGame(
      [barePlayer('p0'), barePlayer('p1'), barePlayer('p2'), barePlayer('p3')],
      { mode: 'patriarchal' },
    );
    const allIds = [
      ...state.deck,
      ...state.players.flatMap(p => [...p.hand, ...p.visibleCards, ...p.hiddenCards]),
    ].map(c => c.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(52);
    expect(allIds).toHaveLength(52);
  });

  it('starts with currentPlayerIndex 0', () => {
    const state = initGame([barePlayer('p0'), barePlayer('p1')], { mode: 'patriarchal' });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('clears all turnContext flags', () => {
    const state = initGame([barePlayer('p0'), barePlayer('p1')], { mode: 'matriarchal' });
    const ctx = state.turnContext;
    expect(ctx.mustPlayDouble).toBe(false);
    expect(ctx.mustFollowSuit).toBeNull();
    expect(ctx.mustPlayBelow7).toBe(false);
    expect(ctx.lastEffectiveCard).toBeNull();
    expect(ctx.attackTarget).toBeNull();
  });

  it('stores the passed config in the state', () => {
    const state = initGame([barePlayer('p0'), barePlayer('p1')], { mode: 'matriarchal' });
    expect(state.config.mode).toBe('matriarchal');
  });

  it('pile and discard are empty at start', () => {
    const state = initGame([barePlayer('p0'), barePlayer('p1')], { mode: 'patriarchal' });
    expect(state.pile).toHaveLength(0);
    expect(state.discard).toHaveLength(0);
  });
});
