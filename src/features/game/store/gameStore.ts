import { create } from 'zustand';
import type { BotDifficulty, Card, GameState, Player, TurnContext } from '@/features/game/utils/types';
import { BOT_PROFILES } from '@/features/game/data/botProfiles';
import {
  initGame,
  isValidPlay,
  applyPlay,
  getBotMove,
  getValidMoves,
  getBestMove,
} from '@/features/game/utils/cardRules';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the index of the next non-finished player after `from`. */
function nextNonFinished(players: Player[], from: number): number {
  const n = players.length;
  let idx = (from + 1) % n;
  for (let i = 0; i < n - 1; i++) {
    if (!players[idx]!.isFinished) return idx;
    idx = (idx + 1) % n;
  }
  return idx;
}

/** True when the player at currentPlayerIndex is human (not a bot). */
function deriveIsPlayerTurn(gs: GameState | null): boolean {
  if (!gs) return false;
  const current = gs.players[gs.currentPlayerIndex];
  return current !== undefined && !current.isBot;
}

function makeHumanPlayer(name: string): Player {
  return {
    id: 'human',
    name,
    title: 'Novice',
    isBot: false,
    isReady: false,
    isFinished: false,
    hand: [],
    visibleCards: [],
    hiddenCards: [],
    stats: { gamesPlayed: 0, placements: [0, 0, 0, 0], achievements: [] },
  };
}

function makeBotPlayer(index: number): Player {
  const profile = BOT_PROFILES[index - 1];
  return {
    id: `bot-${index}`,
    name: profile?.name ?? `Bot ${index}`,
    title: profile?.title ?? 'Joueur',
    isBot: true,
    isReady: true,
    isFinished: false,
    hand: [],
    visibleCards: [],
    hiddenCards: [],
    stats: { gamesPlayed: 0, placements: [0, 0, 0, 0], achievements: [] },
  };
}

/** Total cards remaining for a player across all zones. */
function totalCards(p: Player): number {
  return p.hand.length + p.visibleCards.length + p.hiddenCards.length;
}

/** Push gs onto history (max 10) when in PLAYING phase. */
function pushHistory(history: GameState[], gs: GameState): GameState[] {
  if (gs.phase !== 'PLAYING') return history;
  return [...history, gs].slice(-10);
}

/** Stamp fresh validMoves / bestMove onto a state before storing it. */
function withDerivedFields(gs: GameState): GameState {
  const current = gs.players[gs.currentPlayerIndex];
  if (!current || gs.phase !== 'PLAYING') return gs;
  return {
    ...gs,
    validMoves: getValidMoves(current, gs),
    bestMove: getBestMove(current, gs),
  };
}

// ── Store definition ──────────────────────────────────────────────────────────

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

interface GameStore {
  gameState: GameState | null;
  stateHistory: GameState[];
  difficulty: BotDifficulty;
  isPlayerTurn: boolean;

  startGame: (playerName: string, difficulty: BotDifficulty) => void;
  playCards: (cards: Card[], targetId?: string | null) => boolean;
  swapCard: (handCard: Card, visibleCard: Card) => void;
  setReady: () => void;
  triggerBotTurn: () => void;
  takePile: () => void;
  undoLastMove: () => void;
  resetGame: () => void;
  passTurn: () => void;
  sendEmote: (playerId: string, emote: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────────
  gameState: null,
  stateHistory: [],
  difficulty: 'medium',
  isPlayerTurn: false,

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Starts a new game.
   *
   * Creates a human player and three bot players, calls `initGame` to shuffle
   * and deal a fresh deck, then stores the resulting GameState.
   * The game starts in PREPARATION phase so the human can swap cards.
   */
  startGame: (playerName, difficulty) => {
    const players: Player[] = [
      makeHumanPlayer(playerName),
      makeBotPlayer(1),
      makeBotPlayer(2),
      makeBotPlayer(3),
    ];
    const gs = initGame(players, { mode: 'patriarchal' });
    set({ gameState: gs, difficulty, isPlayerTurn: deriveIsPlayerTurn(gs) });
  },

  /**
   * Plays one or more cards from the human player's active zone.
   *
   * Calls `isValidPlay` first — does nothing if the play is illegal (the UI
   * is responsible for showing feedback in that case).
   * If valid, calls `applyPlay` and updates the store with the new GameState.
   *
   * @param cards    The card(s) to play (same rank, from the active zone).
   * @param targetId Player id to attack when an Ace is played; null otherwise.
   */
  playCards: (cards, targetId = null) => {
    const gs = get().gameState;
    if (!gs) return false;

    // Detect hidden card play (hand and visible both empty for current player)
    const currentPlayer = gs.players[gs.currentPlayerIndex];
    const isHiddenPlay =
      currentPlayer !== undefined &&
      currentPlayer.hand.length === 0 &&
      currentPlayer.visibleCards.length === 0 &&
      cards.every(c => currentPlayer.hiddenCards.some(h => h.id === c.id));

    if (!isValidPlay(cards, gs)) {
      if (isHiddenPlay && currentPlayer) {
        // Revealed hidden card is invalid — move it from hiddenCards to hand first,
        // then take the pile (rule: player receives the card + the whole pile).
        // BUG 4: mustPlayDouble + hidden non-Jack also reaches this branch because
        // isValidPlay returns false for any non-J single under mustPlayDouble. ✓
        const updatedPlayer = {
          ...currentPlayer,
          hiddenCards: currentPlayer.hiddenCards.filter(
            c => !cards.some(played => played.id === c.id),
          ),
          hand: [...currentPlayer.hand, ...cards],
        };
        const newPlayers = gs.players.map((p, i) =>
          i === gs.currentPlayerIndex ? updatedPlayer : p,
        );
        set({ gameState: { ...gs, players: newPlayers } });
        get().takePile();
      }
      return false;
    }
    const next = withDerivedFields(applyPlay(cards, targetId ?? null, gs));
    set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
    return true;
  },

  /**
   * Swaps a card between the human player's hand and their visible zone.
   *
   * Only valid during the PREPARATION phase. The human player is identified
   * by `isBot === false`. Both cards must already belong to the human player.
   * Does nothing if the phase is wrong or either card cannot be found.
   *
   * @param handCard    Card currently in the human's hand to move face-up.
   * @param visibleCard Card currently face-up to move into the human's hand.
   */
  swapCard: (handCard, visibleCard) => {
    const gs = get().gameState;
    if (!gs || gs.phase !== 'PREPARATION') return;

    const humanIdx = gs.players.findIndex(p => !p.isBot);
    if (humanIdx === -1) return;
    const human = gs.players[humanIdx];

    // Verify ownership
    if (!human.hand.some(c => c.id === handCard.id)) return;
    if (!human.visibleCards.some(c => c.id === visibleCard.id)) return;

    const newHand = human.hand.map(c => (c.id === handCard.id ? visibleCard : c));
    const newVisible = human.visibleCards.map(c => (c.id === visibleCard.id ? handCard : c));

    const updatedHuman: Player = { ...human, hand: newHand, visibleCards: newVisible };
    const newPlayers = gs.players.map((p, i) => (i === humanIdx ? updatedHuman : p));
    const next: GameState = { ...gs, players: newPlayers };
    set({ gameState: next, isPlayerTurn: deriveIsPlayerTurn(next) });
  },

  /**
   * Marks the human player as ready and transitions to PLAYING if all players
   * are ready.
   *
   * Bots are pre-marked as ready when created. Calling this action flips the
   * human's `isReady` flag; if every player is now ready the phase advances
   * from PREPARATION to PLAYING.
   */
  setReady: () => {
    const gs = get().gameState;
    if (!gs || gs.phase !== 'PREPARATION') return;

    // Mark human ready; bots are already ready — transition immediately.
    const newPlayers = gs.players.map(p => (p.isBot ? p : { ...p, isReady: true }));
    const allReady = newPlayers.every(p => p.isReady);
    const partial: GameState = { ...gs, players: newPlayers, phase: allReady ? 'PLAYING' : gs.phase };
    const next = withDerivedFields(partial);
    set({ gameState: next, stateHistory: [], isPlayerTurn: deriveIsPlayerTurn(next) });
  },

  /**
   * Human takes the whole pile when they cannot play.
   * Validates that no valid move exists, then moves all pile cards into the
   * human's hand, clears the pile, resets TurnContext, and advances to the
   * next player (index + 1, wrapping).
   */
  takePile: () => {
    const gs = get().gameState;
    if (!gs || gs.phase !== 'PLAYING') return;

    const human = gs.players[gs.currentPlayerIndex];
    if (!human || human.isBot) return;
    if (getValidMoves(human, gs).length > 0) return; // must have no valid move

    const newHuman: Player = { ...human, hand: [...human.hand, ...gs.pile] };
    const newPlayers = gs.players.map((p, i) =>
      i === gs.currentPlayerIndex ? newHuman : p,
    );
    const nextIndex = nextNonFinished(newPlayers, gs.currentPlayerIndex);
    console.log(`[${human.name}] cannot play — takes the pile (${gs.pile.length} cards)`);
    const next = withDerivedFields({
      ...gs,
      players: newPlayers,
      pile: [],
      turnContext: CLEARED_CONTEXT,
      currentPlayerIndex: nextIndex,
    });
    set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
  },

  /**
   * Executes one bot turn for the currently active bot player.
   *
   * Should be invoked by the UI after a short delay (600 ms for easy,
   * 1000 ms for medium, 1500 ms for hard) when `isPlayerTurn` is false.
   *
   * Calls `getBotMove` to choose which cards to play, then validates the
   * play with `isValidPlay` as a safety guard before calling `applyPlay`.
   * For Ace plays, automatically targets the opponent with the fewest cards.
   * Does nothing if the current player is human or no valid move is found.
   */
  triggerBotTurn: () => {
    const { gameState: gs, difficulty } = get();
    if (!gs) return;

    const bot = gs.players[gs.currentPlayerIndex];
    if (!bot || !bot.isBot || bot.isFinished) return;

    const botTakePile = (reason: string) => {
      const newBot: Player = { ...bot, hand: [...bot.hand, ...gs.pile] };
      const newPlayers = gs.players.map((p, i) => i === gs.currentPlayerIndex ? newBot : p);
      const nextIndex = nextNonFinished(newPlayers, gs.currentPlayerIndex);
      console.log(`[${bot.name}] ${reason} — takes the pile (${gs.pile.length} cards)`);
      const next = withDerivedFields({ ...gs, players: newPlayers, pile: [], turnContext: CLEARED_CONTEXT, currentPlayerIndex: nextIndex });
      set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
    };

    const botCards = getBotMove(bot, gs, difficulty);
    if (botCards.length === 0) { botTakePile('cannot play'); return; }

    // Safety: confirm the chosen play is still valid (guards async race conditions)
    if (!isValidPlay(botCards, gs)) {
      const isBotHiddenPlay = bot.hand.length === 0 && bot.visibleCards.length === 0;
      if (isBotHiddenPlay) {
        // Invalid hidden card: move it to hand, then take the pile
        const updatedBot: Player = {
          ...bot,
          hiddenCards: bot.hiddenCards.filter(c => !botCards.some(b => b.id === c.id)),
          hand: [...botCards, ...gs.pile],
        };
        const newPlayers = gs.players.map((p, i) => i === gs.currentPlayerIndex ? updatedBot : p);
        const nextIndex = nextNonFinished(newPlayers, gs.currentPlayerIndex);
        console.log(`[${bot.name}] invalid hidden card — takes the pile (${gs.pile.length} cards)`);
        const next = withDerivedFields({ ...gs, players: newPlayers, pile: [], turnContext: CLEARED_CONTEXT, currentPlayerIndex: nextIndex });
        set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
      } else {
        botTakePile('invalid move from getBotMove');
      }
      return;
    }

    // For Ace: target the opponent with the fewest remaining cards
    let targetId: string | null = null;
    if (botCards[0].rank === 'A') {
      const others = gs.players.filter(p => p.id !== bot.id && totalCards(p) > 0);
      if (others.length > 0) {
        targetId = others.reduce((t, p) =>
          totalCards(p) < totalCards(t) ? p : t,
        ).id;
      }
    }

    const next = withDerivedFields(applyPlay(botCards, targetId, gs));
    set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
    const BOT_EMOTES = ['😊', '😐', '😍', '😵'];
    if (Math.random() < 0.2) get().sendEmote(bot.id, BOT_EMOTES[Math.floor(Math.random() * BOT_EMOTES.length)]);
  },

  /**
   * Resets the store to its initial state, discarding the current game.
   *
   * Called when returning to the lobby or starting over. Does not call any
   * engine function — just nulls out `gameState`.
   */
  undoLastMove: () => {
    const { stateHistory } = get();
    if (stateHistory.length === 0) return;
    const prev = stateHistory[stateHistory.length - 1];
    set({ gameState: prev, stateHistory: stateHistory.slice(0, -1), isPlayerTurn: deriveIsPlayerTurn(prev) });
  },

  resetGame: () => {
    set({ gameState: null, stateHistory: [], isPlayerTurn: false });
  },

  passTurn: () => {
    const gs = get().gameState;
    if (!gs || gs.phase !== 'PLAYING') return;
    const human = gs.players[gs.currentPlayerIndex];
    if (!human || human.isBot) return;
    if (getValidMoves(human, gs).length > 0) return;
    if (gs.pile.length > 0) return; // pile not empty — must takePile instead
    const nextIndex = nextNonFinished(gs.players, gs.currentPlayerIndex);
    const next = withDerivedFields({ ...gs, currentPlayerIndex: nextIndex });
    set({ gameState: next, stateHistory: pushHistory(get().stateHistory, gs), isPlayerTurn: deriveIsPlayerTurn(next) });
  },

  sendEmote: (playerId, emote) => {
    const gs = get().gameState;
    if (!gs) return;
    const newEmotes = [...gs.emotes, { playerId, emote, timestamp: Date.now() }].slice(-10);
    set({ gameState: { ...gs, emotes: newEmotes } });
  },
}));
