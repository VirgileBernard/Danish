## Card Rules — Complete Reference

### General rules

- Each player starts with 3 hidden cards (face down), 3 visible cards (face up on
  top of hidden), and 3 cards in hand.
- Before the game starts, players may freely swap cards between hand and visible cards.
  Strategy: put strongest cards face up.
- The dealer plays first.
- Play order: clockwise.
- On your turn you MUST play if you can. You cannot pass voluntarily (except the 4
  edge case below).
- You must play a card of value GREATER THAN OR EQUAL TO the last card played.
- You may play 2 or 3 cards of the same value on your turn.
- While the deck is not empty, you must always have at least 3 cards in hand after
  playing. Draw immediately after playing.
- A card drawn from the deck CANNOT be added to the cards just played in the same
  turn.
- If you cannot play, you take ALL cards in the pile. The player to your left then
  starts fresh on an empty pile.
- Only the player whose turn it is may play (no "coupe sauvage" / wild cuts).

### Card order of play (hand → visible → hidden)

1. You must empty your hand before touching visible cards.
2. Exception: if your last card in hand matches a visible card in value, you may play
   both together in the same turn.
3. You must empty your visible cards before touching hidden cards.
4. Hidden cards must be revealed to all players when played.
5. If a hidden card is invalid when flipped, the player takes the pile + that card.

### 4-of-a-kind auto-cut

When 4 consecutive cards of the same value are played (across multiple players' turns),
the pile is cut automatically. The player who completed the 4th card plays again on an
empty pile. Example: A plays 7, B plays 7, C plays 7, D plays 7 → auto-cut, D plays again.

### End of game

- First player to have no cards left (hand + visible + hidden) wins.
- Other players continue until only one remains (the loser).
- The loser shuffles and deals the next game.

---

## Card Rules — Special Cards

| Card | Effect                                                                                                                           | Key constraints                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 2    | Resets pile to 0. Does NOT cut (pile stays).                                                                                     | Playable on any card if suit condition met                                                                   |
| 3    | Mirror — copies the previous card's value AND effect                                                                             | On empty pile = value 0 (anything can follow). 3 on 3 = copies grandparent card                              |
| 4    | Weakest card                                                                                                                     | Cannot play on empty pile. If player's only option is 4 on empty pile → say "je passe", left neighbour plays |
| 6    | Next player must play same suit + higher value (or another 6)                                                                    | See 6 + specials rules below                                                                                 |
| 7    | Next player must play value <= 7                                                                                                 | Chains. 2/3 allowed. 10 NOT allowed after 7. Ace NOT allowed after 7                                         |
| 8    | Skips next player's turn                                                                                                         | 2x 8 = skip 2 players. N x 8 = skip N players                                                                |
| 10   | Always cuts the pile (goes to discard). Player who played 10 plays again on empty pile                                           | Cannot be played after a 7. Can be played on any other card including Ace                                    |
| J    | Next player must play 2 cards of the same value (any value, can be lower than J) OR another J                                    | Valid doubles: 2x2, 2x3, 2x10, 2xanything, or a single J                                                     |
| Q    | No special rule                                                                                                                  | Value depends on mode: patriarchal=9, matriarchal=10                                                         |
| K    | No special rule                                                                                                                  | Value depends on mode: patriarchal=10, matriarchal=9                                                         |
| A    | Attacker designates any player. That player must now play (it becomes their turn). They risk taking the pile if they cannot play | Cannot be played after a 7                                                                                   |

### Rule of 6 — detailed

When a 6 is played, the next player must play:

- Another 6 (any suit) → valid, new suit rule applies with this 6
- A card of the SAME suit with value >= 6

Special cards of the SAME suit may be played and their effects apply normally:

- 2 (same suit) → resets pile to 0, suit rule cancelled
- 3 (same suit) → mirrors the 6, so next player must still play same suit + above 6
- 10 (same suit) → cuts, suit rule cancelled

Special cards of a DIFFERENT suit are INVALID after a 6.

### Rule of Jack — detailed

On a Jack, the next player must play a double (2 cards of identical value) OR another J.

Valid responses to a Jack:

- Any pair: 2x4, 2x7, 2x10, 2x2, 2x3, etc. (value can be lower than J)
- A single J (applies Jack rule to the next player)

Invalid responses:

- A single card that is not a J (including a single 8)

Jack + last card in hand edge cases:

- Player has 1 card in hand + same card in visibles → plays hand card + visible card (valid double)
- Player has 1 card in hand + no matching visible → cannot play, takes the pile
- If the double played is 2x10 → cuts the pile. 2x2 → resets to 0. 2x3 → mirror applies to next player.

### Rule of 7 — detailed

After a 7, next player must play value <= 7 (inclusive).

- Allowed: 2, 3, 4, 5, 6, 7
- NOT allowed: 8, 9, J, Q, K, A, 10
- Rule chains: if the next player also plays a 7, the player after must also play <= 7.

### 4-of-a-kind — detailed

Tracked via `turnContext.consecutiveSameValue`.

- Resets to 1 whenever a different value is played.
- Increments when the same value is played consecutively (across turns).
- At 4 → auto-cut, pile goes to discard, `consecutiveSameValue` resets to 0.
- The player who triggered the cut plays again.

---

## Feature Flags

```typescript
const RULES_CONFIG: RulesConfig = {
  mode: "patriarchal", // voted by players before game starts
};
```

---

## isValidPlay — Priority Chain

```
1. cards.length === 0 → invalid

2. 10 played?
   → pile goes to discard (cut). Always valid EXCEPT after a 7.
   → after a 7: invalid.

3. turnContext.mustPlayDouble?
   → cards.length < 2 AND card.rank !== "J" → invalid
   → (pairs of any value are valid, including lower than J)

4. turnContext.mustPlayBelow7?
   → card.value > 4 (i.e. rank not in [2,3,4,5,6,7]) → invalid
   → 10 is also blocked here (handled above, but double-check)

5. turnContext.mustFollowSuit?
   → card.suit !== requiredSuit AND card.rank !== "6" → invalid
   → Exception: 2, 3, 10 of the SAME suit → valid (effects apply)
   → 2/3/10 of a DIFFERENT suit → invalid

6. pile is empty?
   → card.rank === "4" → invalid
   → otherwise → valid

7. card.rank === "3"?
   → always valid on non-empty pile (mirror, value = grandparent)

8. card.value >= topCard effectiveValue? → valid
   → else → invalid
```

---

## Bot Strategy

### Easy — random valid move

### Medium — fixed priorities

```
1. Play weakest valid normal cards first (5, 6, 7, 8, 9)
2. Then mid cards (J, Q, K)
3. Hold specials (10, 2, A) for the right moment
4. Prep phase: place 10, A, 2 as visible cards
```

### Hard — table reading

```
All medium rules +
- Attack with Ace → target player with fewest cards
- Hold 10 if an opponent is in their visible cards phase
- Play 8 to skip the most advanced opponent
- Prep phase: optimise based on visible opponent cards
- Track consecutive same-value cards to set up auto-cuts
```

Bot play delay: Easy 600ms · Medium 1000ms · Hard 1500ms

---
