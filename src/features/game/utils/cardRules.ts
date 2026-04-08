import type { Card, GameState, RulesConfig } from '@/features/game/utils/types';

// Ranks whose face value is ≤ 7 — the only ranks legal under the 7 rule.
// 10 is NOT allowed under the 7 rule (handled explicitly in the 10 branch).
const BELOW_7_RANKS = new Set<Card['rank']>(['2', '3', '4', '5', '6', '7']);

// Ranks exempt from Jack's "must play a double" obligation.
// 10 is also exempt but is handled before this check.
const JACK_EXCEPTION_RANKS = new Set<Card['rank']>(['2', '3', 'J']);

/**
 * Returns the effective value of a card given the current rules config.
 * Q and K swap values between patriarchal and matriarchal modes;
 * all other cards return their fixed value.
 */
export function getEffectiveValue(card: Card, config: RulesConfig): number {
  if (card.rank === 'Q') return config.mode === 'matriarchal' ? 10 : 9;
  if (card.rank === 'K') return config.mode === 'matriarchal' ? 9 : 10;
  return card.value;
}

/**
 * Returns true when `cards` is a legal play given the current game state.
 *
 * Priority order — first matching branch wins and returns immediately:
 *   1. 10           → valid except after a 7 or wrong suit under 6 rule
 *   2. mustPlayDouble (Jack rule)
 *   3. mustPlayBelow7 (Seven rule)
 *   4. mustFollowSuit (Six rule)
 *   5. Empty pile
 *   6. Default value comparison
 *
 * Pure function — never mutates state.
 */
export function isValidPlay(cards: Card[], state: GameState): boolean {
  if (cards.length === 0) return false;

  // Playing N identical cards is always allowed — verify all share the same rank.
  const rank = cards[0].rank;
  if (!cards.every(c => c.rank === rank)) return false;

  const card = cards[0];
  const { turnContext, pile, config } = state;

  // ── 1. 10 ────────────────────────────────────────────────────────────────
  // 10 cuts the pile and overrides every constraint, with two exceptions:
  //   a) forbidden after a 7 (mustPlayBelow7)
  //   b) forbidden after a 6 if the 10 does not match the required suit
  if (rank === '10') {
    if (turnContext.mustPlayBelow7) return false;
    if (turnContext.mustFollowSuit !== null && card.suit !== turnContext.mustFollowSuit) return false;
    return true;
  }

  // ── 2. Jack rule — must play a double ────────────────────────────────────
  // 2, 3 and J satisfy the obligation as singles; all other ranks require N ≥ 2.
  if (turnContext.mustPlayDouble) {
    if (!JACK_EXCEPTION_RANKS.has(rank) && cards.length < 2) return false;
  }

  // ── 3. Seven rule — must play ≤ 7 ────────────────────────────────────────
  // Only face-value ≤ 7 ranks are legal. Ace is explicitly forbidden by the rules.
  if (turnContext.mustPlayBelow7) {
    if (!BELOW_7_RANKS.has(rank)) return false;
  }

  // ── 4. Six rule — must follow suit and play higher ────────────────────────
  // Another 6 (any suit) always satisfies the constraint.
  // Specials 2, 3 of the SAME suit are valid (effect applies); wrong suit → invalid.
  // All other cards must match the required suit AND beat mustFollowAboveValue.
  if (turnContext.mustFollowSuit !== null) {
    const requiredSuit = turnContext.mustFollowSuit;
    if (rank === '6') {
      // Another 6 of any suit is valid — fall through to remaining checks
    } else if (rank === '2' || rank === '3') {
      if (card.suit !== requiredSuit) return false;
      // Same-suit 2/3: valid — fall through
    } else {
      if (card.suit !== requiredSuit) return false;
      const gateValue = turnContext.mustFollowAboveValue ?? 0;
      if (getEffectiveValue(card, config) <= gateValue) return false;
    }
  }

  // ── 5. Empty pile ─────────────────────────────────────────────────────────
  // 4 cannot open a fresh pile (after 10 cuts or at game start).
  // After a 2 reset, pile.length > 0 → this branch is never reached, 4 is valid.
  if (pile.length === 0) {
    return rank !== '4';
  }

  // ── 6. Default value comparison ───────────────────────────────────────────
  // 3 copies the effective top of pile — it carries no value of its own and
  // therefore cannot be gated by a value comparison.
  if (rank === '3') return true;

  // Cards may equal or beat the effective pile top (>= not strict >).
  // lastEffectiveCard is null after a 2 reset (effective value 0),
  // which allows 4 (value 1) and any higher card to follow.
  const effectiveValue = turnContext.lastEffectiveCard
    ? getEffectiveValue(turnContext.lastEffectiveCard, config)
    : 0;
  return getEffectiveValue(card, config) >= effectiveValue;
}
