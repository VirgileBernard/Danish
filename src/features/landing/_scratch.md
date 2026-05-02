import { useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import type { BotDifficulty } from '@/features/game/utils/types';

const DIFFICULTY_LEVELS: { label: string; value: BotDifficulty; desc: string }[] = [
  { label: 'Facile',    value: 'easy',   desc: 'Les bots jouent au hasard, sans aucune stratégie.' },
  { label: 'Moyen',     value: 'medium', desc: 'Les bots appliquent quelques stratégies de base.' },
  { label: 'Difficile', value: 'hard',   desc: 'Les bots jouent avec une stratégie avancée — prépare-toi !' },
];


interface LobbyPageProps {
  onNavigate: (path: string) => void;
}

export function LobbyPage({ onNavigate }: LobbyPageProps) {
  const { setDifficulty } = useGameStore();
  const [diffIndex, setDiffIndex] = useState(0);

  const currentDiff = DIFFICULTY_LEVELS[diffIndex]!;

  function handlePlay() {
    setDifficulty(currentDiff.value);
    onNavigate('/game');
  }