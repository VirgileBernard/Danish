import type { Card, GameState } from '@/features/game/utils/types';

// Ranks whose face value is ≤ 7 — the only ranks legal under the 7 rule.
// 10 is also allowed by the 7 rule but is handled earlier (always valid).
const BELOW_7_RANKS = new Set<Card['rank']>(['2', '3', '4', '5', '6', '7']);

// Ranks exempt from Jack's "must play a double" obligation.
// 10 is also exempt but is handled before this check (always valid).
const JACK_EXCEPTION_RANKS = new Set<Card['rank']>(['2', '3', 'J']);

/**
 * Returns true when `cards` is a legal play given the current game state.
 *
 * Priority order — first matching branch wins and returns immediately:
 *   1. 10           → always valid, overrides every constraint
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
  const { turnContext, pile } = state;

  // ── 1. 10 — always valid ──────────────────────────────────────────────────
  // 10 cuts the pile and overrides every active rule constraint.
  if (rank === '10') return true;

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
  // six_specials_ignore_suit = false (pending organiser confirmation):
  // special cards must also match the required suit.
  // TODO: if organiser confirms specials may ignore suit, gate this block behind
  //       RULES_CONFIG.six_specials_ignore_suit and skip for isSpecial cards.
  // TODO: 3 on a 6 is also ambiguous — 3 copies the 6, so effective suit matches,
  //       but 3's own value (0) always fails the > check. Needs ruling.
  if (turnContext.mustFollowSuit !== null) {
    if (card.suit !== turnContext.mustFollowSuit) return false;
    const gateValue = turnContext.lastEffectiveCard?.value ?? 0;
    if (card.value <= gateValue) return false;
  }

  // ── 5. Empty pile ─────────────────────────────────────────────────────────
  // 4 cannot open a fresh pile (after 10 cuts or at game start).
  // After a 2 reset, pile.length > 0 → this branch is never reached, 4 is valid.
  if (pile.length === 0) {
    return rank !== '4';
  }

  // ── 6. Default value comparison ───────────────────────────────────────────
  // 3 copies the effective top of pile — it carries no value of its own and
  // therefore cannot be gated by a > comparison (VALUE_MAP gives 3 a value of 0).
  if (rank === '3') return true;

  // All other cards must strictly beat the effective pile top.
  // lastEffectiveCard is null after a 2 reset (engine sets it to null to signal
  // effective value 0), which allows 4 (value 1) and any higher card to follow.
  const effectiveValue = turnContext.lastEffectiveCard?.value ?? 0;
  return card.value > effectiveValue;
}
