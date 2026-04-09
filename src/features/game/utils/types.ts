// Core domain types for the Danish card game.
// These are shared across all game features — keep them pure (no UI imports).

export interface Card {
  id: string; // e.g. "Ah" (Ace of hearts)
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  // 4→1, 5→2, 6→3, 7→4, 8→5, 9→6, J→8, Q→9, K→10, A→11, 2→12, 3→0, 10→99
  value: number;
  isSpecial: boolean;
}

export interface Player {
  id: string;
  name: string;
  title: string;
  isBot: boolean;
  isReady: boolean;
  isFinished: boolean;
  hand: Card[];
  visibleCards: Card[];
  hiddenCards: Card[];
  stats: {
    gamesPlayed: number;
    placements: [number, number, number, number]; // [1st, 2nd, 3rd, 4th]
    achievements: string[];
  };
}

export interface TurnContext {
  mustPlayDouble: boolean;           // Jack rule
  mustFollowSuit: string | null;     // "hearts" | null — 6 rule
  mustFollowAboveValue: number | null; // value to beat when mustFollowSuit is active
  mustPlayBelow7: boolean;           // 7 rule (<=7, inclusive)
  lastEffectiveCard: Card | null;    // for chained 3s
  consecutiveSameValue: number;      // tracks 4-of-a-kind auto-cut detection
  lastPlayedValue: number | null;    // value of last card played
  skippedPlayers: number;            // multiple 8s skip multiple players
  attackTarget: string | null;       // player id targeted by Ace
}

export interface RulesConfig {
  // patriarchal (default): K=10, Q=9
  // matriarchal: Q=10, K=9
  mode: 'patriarchal' | 'matriarchal';
}

export interface GameState {
  phase: 'SETUP' | 'PREPARATION' | 'PLAYING' | 'FINISHED';
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  pile: Card[];
  discard: Card[];
  turnContext: TurnContext;
  config: RulesConfig;
  helperActive: boolean;
  validMoves: Card[];
  bestMove: Card | null;
  emotes: { playerId: string; emote: string; timestamp: number }[];
  finishOrder: string[];
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';
