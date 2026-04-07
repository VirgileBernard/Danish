import { create } from 'zustand';
import type { GameState } from '@/features/game/utils/types';

// Initial empty state — populated by initGame() when a match starts.
const DEFAULT_TURN_CONTEXT = {
  mustPlayDouble: false,
  mustFollowSuit: null,
  mustPlayBelow7: false,
  lastEffectiveCard: null,
  skippedPlayers: 0,
  attackTarget: null,
};

const INITIAL_STATE: GameState = {
  phase: 'SETUP',
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  pile: [],
  turnContext: DEFAULT_TURN_CONTEXT,
  helperActive: false,
  validMoves: [],
  bestMove: null,
  emotes: [],
  finishOrder: [],
};

interface GameStore extends GameState {
  setGameState: (state: GameState) => void;
  toggleHelper: () => void;
  addEmote: (playerId: string, emote: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL_STATE,

  setGameState: (state) => set(state),

  toggleHelper: () =>
    set((prev) => ({ helperActive: !prev.helperActive })),

  addEmote: (playerId, emote) =>
    set((prev) => ({
      emotes: [
        ...prev.emotes,
        { playerId, emote, timestamp: Date.now() },
      ],
    })),

  reset: () => set(INITIAL_STATE),
}));
