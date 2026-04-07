// Stable re-export barrel for all game-domain types.
// types.ts is the single source of truth — never duplicate interfaces here.
// Import from `@/features/game/utils/gameTypes` wherever a clean alias is preferred.
export type { Card, Player, TurnContext, GameState, BotDifficulty } from '@/features/game/utils/types';
