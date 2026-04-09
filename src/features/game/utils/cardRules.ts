import type { BotDifficulty, Card, GameState, Player, RulesConfig, TurnContext } from '@/features/game/utils/types';
import { createDeck } from '@/features/game/utils/deck';

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
  // Once satisfied, pairs of ANY value are legal (including lower than J) — so
  // we return immediately and skip the value comparison.
  if (turnContext.mustPlayDouble) {
    if (!JACK_EXCEPTION_RANKS.has(rank) && cards.length < 2) return false;
    // Obligation satisfied — bypass value check. Only rank '4' on an empty pile
    // remains forbidden (cannot open a fresh pile with the weakest card).
    if (pile.length === 0 && rank === '4') return false;
    return true;
  }

  // ── 3. Seven rule — must play ≤ 7 ────────────────────────────────────────
  // Only face-value ≤ 7 ranks are legal. Ace is explicitly forbidden by the rules.
  // return true immediately once the rank check passes — value comparison is
  // bypassed, otherwise 4/5/6 (values 1–3) would fail the ≥ pile-top check
  // since lastEffectiveCard is still the 7 (value 4).
  if (turnContext.mustPlayBelow7) {
    if (!BELOW_7_RANKS.has(rank)) return false;
    return true;
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

// ── Cleared context — used after any cut ──────────────────────────────────────
const CLEARED_CONTEXT: TurnContext = {
  mustPlayDouble: false,
  mustFollowSuit: null,
  mustFollowAboveValue: null,
  mustPlayBelow7: false,
  lastEffectiveCard: null,
  consecutiveSameValue: 0,
  lastPlayedValue: null,
  skippedPlayers: 0,
  attackTarget: null,
};

/**
 * Applies a validated play and returns the next GameState.
 *
 * Responsibilities (in order):
 *   1. Remove played cards from the current player's zones (hand → visible → hidden)
 *   2. Add cards to pile
 *   3. Detect auto-cut (4-of-a-kind) or 10 cut — move pile to discard
 *   4. Compute new TurnContext based on the card played
 *   5. Replenish hand from deck (up to 3 cards)
 *   6. Detect if current player has finished
 *   7. Advance currentPlayerIndex (same for cuts, attacked player for Ace,
 *      skip N for 8s, +1 otherwise)
 *
 * Pure function — never mutates state or arguments.
 */
export function applyPlay(
  cards: Card[],
  targetId: string | null,
  state: GameState,
): GameState {
  const rank = cards[0].rank;
  const card = cards[0];
  const { turnContext, config } = state;
  const currentPlayer = state.players[state.currentPlayerIndex];

  // ── 1. Remove played cards from player zones ──────────────────────────────
  const playedIds = new Set(cards.map(c => c.id));
  const newHand = currentPlayer.hand.filter(c => !playedIds.has(c.id));
  const newVisible = currentPlayer.visibleCards.filter(c => !playedIds.has(c.id));
  const newHidden = currentPlayer.hiddenCards.filter(c => !playedIds.has(c.id));

  // ── 2. Add played cards to pile ───────────────────────────────────────────
  const grownPile = [...state.pile, ...cards];

  // ── 3. Detect 4-of-a-kind and cut ────────────────────────────────────────
  const effectiveVal = getEffectiveValue(card, config);
  const newConsecutive =
    turnContext.lastPlayedValue !== null && effectiveVal === turnContext.lastPlayedValue
      ? turnContext.consecutiveSameValue + cards.length
      : cards.length;
  const isFourOfAKind = newConsecutive >= 4;
  const isCut = rank === '10' || isFourOfAKind;

  const finalPile = isCut ? [] : grownPile;
  const finalDiscard = isCut ? [...state.discard, ...grownPile] : state.discard;

  // ── 4. Build new TurnContext ──────────────────────────────────────────────
  let newContext: TurnContext;

  if (isCut) {
    newContext = { ...CLEARED_CONTEXT };
  } else {
    const base: TurnContext = {
      mustPlayDouble: false,
      mustFollowSuit: null,
      mustFollowAboveValue: null,
      mustPlayBelow7: false,
      lastEffectiveCard: card,
      consecutiveSameValue: newConsecutive,
      lastPlayedValue: effectiveVal,
      skippedPlayers: 0,
      attackTarget: null,
    };

    switch (rank) {
      case '2':
        // Reset effective pile value to 0; pile stays (no cut)
        newContext = { ...base, lastEffectiveCard: null };
        break;

      case '3': {
        // Mirror the grandparent card's FULL effect forward (value + all context flags)
        const mirrored = turnContext.lastEffectiveCard;
        newContext = {
          ...base,
          lastEffectiveCard: mirrored,
          // 6 → carry suit constraint
          mustFollowSuit: mirrored?.rank === '6' ? mirrored.suit : null,
          mustFollowAboveValue:
            mirrored?.rank === '6' ? getEffectiveValue(mirrored, config) : null,
          // J → next player must still play a double
          mustPlayDouble: mirrored?.rank === 'J',
          // 8 → next player is skipped (advancement handled below)
          skippedPlayers: mirrored?.rank === '8' ? 1 : 0,
        };
        break;
      }

      case '6':
        newContext = {
          ...base,
          mustFollowSuit: card.suit,
          mustFollowAboveValue: effectiveVal,
        };
        break;

      case '7':
        newContext = { ...base, mustPlayBelow7: true };
        break;

      case '8':
        // N eights played → N players skipped; advancement is handled below
        newContext = { ...base, skippedPlayers: cards.length };
        break;

      case 'J':
        newContext = { ...base, mustPlayDouble: true };
        break;

      case 'A':
        newContext = { ...base, attackTarget: targetId };
        break;

      default:
        newContext = base;
    }
  }

  // ── 5. Replenish hand from deck (up to 3 cards) ───────────────────────────
  let repHand = newHand;
  let repDeck = state.deck;
  while (repHand.length < 3 && repDeck.length > 0) {
    repHand = [...repHand, repDeck[0]];
    repDeck = repDeck.slice(1);
  }

  // ── 6. Detect finish ──────────────────────────────────────────────────────
  const playerDone =
    repHand.length === 0 && newVisible.length === 0 && newHidden.length === 0;
  const newFinishOrder =
    playerDone && !state.finishOrder.includes(currentPlayer.id)
      ? [...state.finishOrder, currentPlayer.id]
      : state.finishOrder;

  // ── 7. Update player in players array ────────────────────────────────────
  const updatedPlayer: Player = {
    ...currentPlayer,
    hand: repHand,
    visibleCards: newVisible,
    hiddenCards: newHidden,
    isFinished: currentPlayer.isFinished || playerDone,
  };
  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p,
  );

  // ── 8. Advance to next player (skip finished players) ────────────────────
  const n = state.players.length;
  let rawNext: number;

  if (isCut) {
    rawNext = state.currentPlayerIndex;
  } else if (rank === 'A' && targetId !== null) {
    const found = state.players.findIndex(p => p.id === targetId);
    rawNext = found !== -1 ? found : (state.currentPlayerIndex + 1) % n;
  } else {
    // 3 mirroring an 8 propagates the skip (turnContext still holds the pre-play state)
    const mirroredEight = rank === '3' && turnContext.lastEffectiveCard?.rank === '8';
    const skip = rank === '8' ? cards.length : mirroredEight ? 1 : 0;
    rawNext = (state.currentPlayerIndex + 1 + skip) % n;
  }

  let nextIndex = rawNext;
  for (let i = 0; i < n; i++) {
    if (!newPlayers[nextIndex]!.isFinished) break;
    nextIndex = (nextIndex + 1) % n;
  }

  // ── 9. Check for game end ─────────────────────────────────────────────────
  const activePlayers = newPlayers.filter(p => !p.isFinished);
  let finalPhase: GameState['phase'] = state.phase;
  let finalFinishOrder = newFinishOrder;

  if (state.phase === 'PLAYING' && activePlayers.length === 1) {
    finalPhase = 'FINISHED';
    const loser = activePlayers[0]!;
    if (!finalFinishOrder.includes(loser.id)) {
      finalFinishOrder = [...finalFinishOrder, loser.id];
    }
  }

  return {
    ...state,
    phase: finalPhase,
    players: newPlayers,
    deck: repDeck,
    pile: finalPile,
    discard: finalDiscard,
    turnContext: newContext,
    currentPlayerIndex: nextIndex,
    finishOrder: finalFinishOrder,
    validMoves: [],
    bestMove: null,
  };
}

// ── Ranks to conserve — played only when no normal card is available ───────────
const HOLD_RANKS = new Set<Card['rank']>(['2', '10', 'A']);

/**
 * Returns all uniquely-playable cards for `player` in the current state.
 *
 * Active zone (in source order):
 *   hand → visibleCards (hand empty) → hiddenCards (visible empty)
 *
 * Deduplication: one representative card per rank.
 * A rank is included if ANY grouping of that rank (single / pair / triple)
 * passes isValidPlay — covering the mustPlayDouble case where singles are
 * blocked but pairs are valid.
 *
 * Pure function — never mutates.
 */
export function getValidMoves(player: Player, state: GameState): Card[] {
  const zone =
    player.hand.length > 0
      ? player.hand
      : player.visibleCards.length > 0
        ? player.visibleCards
        : player.hiddenCards;

  // Group by rank, preserving first-seen insertion order
  const byRank = new Map<Card['rank'], Card[]>();
  for (const card of zone) {
    const existing = byRank.get(card.rank);
    byRank.set(card.rank, existing ? [...existing, card] : [card]);
  }

  const result: Card[] = [];
  for (const group of byRank.values()) {
    let canPlay = false;
    for (let n = 1; n <= group.length && !canPlay; n++) {
      if (isValidPlay(group.slice(0, n), state)) canPlay = true;
    }
    if (canPlay) result.push(group[0]);
  }

  return result;
}

/**
 * Returns the single best card to play using a fixed priority heuristic:
 *   1. Weakest valid normal card (conserve specials)
 *   2. Ace — only if another player has fewer total cards (meaningful attack)
 *   3. 10 (cut is powerful)
 *   4. 2 (reset — weakest special)
 *   5. Ace as absolute last resort
 *   6. null — no valid moves
 *
 * Pure function — never mutates.
 */
export function getBestMove(player: Player, state: GameState): Card | null {
  const valid = getValidMoves(player, state);
  if (valid.length === 0) return null;

  // Prefer the weakest valid normal card
  const normals = valid.filter(c => !HOLD_RANKS.has(c.rank));
  if (normals.length > 0) {
    return normals.reduce((best, card) =>
      getEffectiveValue(card, state.config) < getEffectiveValue(best, state.config) ? card : best,
    );
  }

  // Only specials remain — apply hold heuristics
  const ace = valid.find(c => c.rank === 'A');
  if (ace) {
    // Play Ace only when another player is clearly more advanced (fewest total cards)
    const others = state.players.filter(p => p.id !== player.id);
    if (others.length > 0) {
      const playerTotal =
        player.hand.length + player.visibleCards.length + player.hiddenCards.length;
      const target = others.reduce((best, p) => {
        const cntBest = best.hand.length + best.visibleCards.length + best.hiddenCards.length;
        const cntP = p.hand.length + p.visibleCards.length + p.hiddenCards.length;
        return cntP < cntBest ? p : best;
      }, others[0]);
      const targetTotal = target.hand.length + target.visibleCards.length + target.hiddenCards.length;
      if (targetTotal < playerTotal) return ace;
    }
  }

  // 10 cuts the pile — strong play; 2 resets — moderate; Ace falls back here
  const ten = valid.find(c => c.rank === '10');
  if (ten) return ten;
  const two = valid.find(c => c.rank === '2');
  if (two) return two;
  if (ace) return ace;

  return null; // unreachable if valid.length > 0, but satisfies TS
}

// ── initGame helper ───────────────────────────────────────────────────────────

function shuffleDeck(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Creates a fresh shuffled GameState ready for the PREPARATION phase.
 *
 * Deals per player (in order):
 *   - 3 hiddenCards (face-down)
 *   - 3 visibleCards (face-up on top of hidden)
 *   - 3 hand cards
 *
 * Remaining cards stay in deck. currentPlayerIndex = 0 (dealer plays first).
 * All TurnContext flags are cleared.
 *
 * Pure function — player objects are not mutated (new objects returned).
 */
export function initGame(players: Player[], config: RulesConfig): GameState {
  const shuffled = shuffleDeck(createDeck());
  const n = players.length;

  const dealtPlayers = players.map((player, i) => {
    const offset = i * 9;
    return {
      ...player,
      hiddenCards: shuffled.slice(offset, offset + 3),
      visibleCards: shuffled.slice(offset + 3, offset + 6),
      hand: shuffled.slice(offset + 6, offset + 9),
    };
  });

  return {
    phase: 'PREPARATION',
    players: dealtPlayers,
    currentPlayerIndex: 0,
    deck: shuffled.slice(n * 9),
    pile: [],
    discard: [],
    turnContext: { ...CLEARED_CONTEXT },
    config,
    helperActive: false,
    validMoves: [],
    bestMove: null,
    emotes: [],
    finishOrder: [],
  };
}

/**
 * Returns the cards a bot should play on its turn, chosen according to difficulty.
 *
 * Easy   — picks a random card from the valid moves.
 * Medium — uses the getBestMove heuristic (weakest normal, then specials).
 * Hard   — same as medium for now; future: table-reading extensions.
 *
 * The returned array is ready to pass directly to applyPlay:
 * - Empty array  → no valid moves (caller must handle "take the pile").
 * - [card]       → single-card play.
 * - [card, card] → pair (e.g. when mustPlayDouble is active and two of the
 *                   same rank are available).
 *
 * Pure function — never mutates state or player.
 */
export function getBotMove(
  bot: Player,
  state: GameState,
  difficulty: BotDifficulty,
): Card[] {
  const valid = getValidMoves(bot, state);
  if (valid.length === 0) return [];

  // Pick a representative card based on difficulty
  let picked: Card;
  if (difficulty === 'easy') {
    picked = valid[Math.floor(Math.random() * valid.length)];
  } else {
    // medium / hard: delegate to the shared heuristic
    const best = getBestMove(bot, state);
    if (!best) return [];
    picked = best;
  }

  // Determine the bot's active zone (mirrors getValidMoves zone logic)
  const zone =
    bot.hand.length > 0
      ? bot.hand
      : bot.visibleCards.length > 0
        ? bot.visibleCards
        : bot.hiddenCards;

  // Under mustPlayDouble, play a pair when the zone has two of the same rank
  const sameRank = zone.filter(c => c.rank === picked.rank);
  if (state.turnContext.mustPlayDouble && sameRank.length >= 2) {
    return sameRank.slice(0, 2);
  }

  return [picked];
}
