import { useEffect, useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { PlayerZone } from './PlayerZone';
import { GameCard } from './GameCard';
import { EmoteWheel } from './EmoteWheel';
import type { Card, Player } from '@/features/game/utils/types';

export function GameBoard() {
  const { gameState, isPlayerTurn, playCards, swapCard, setReady, triggerBotTurn, takePile, undoLastMove, stateHistory, sendEmote } =
    useGameStore();
  const [pendingAce, setPendingAce] = useState<Card | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeBubbles, setActiveBubbles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!gameState || gameState.phase !== 'PLAYING' || isPlayerTurn) return;
    const t = setTimeout(() => triggerBotTurn(), 800);
    return () => clearTimeout(t);
  }, [gameState, isPlayerTurn, triggerBotTurn]);

  useEffect(() => {
    if (!isPlayerTurn) { setPendingAce(null); setSelectedCards([]); }
  }, [isPlayerTurn]);

  useEffect(() => {
    if (gameState?.phase !== 'PLAYING') { setGameStarted(false); return; }
    const t = setTimeout(() => setGameStarted(true), 500);
    return () => clearTimeout(t);
  }, [gameState?.phase]);

  const lastEmote = gameState?.emotes[gameState.emotes.length - 1];
  useEffect(() => {
    if (!lastEmote) return;
    setActiveBubbles(p => ({ ...p, [lastEmote.playerId]: lastEmote.emote }));
    const t = setTimeout(() => setActiveBubbles(p => { const n = { ...p }; delete n[lastEmote.playerId]; return n; }), 3000);
    return () => clearTimeout(t);
  }, [lastEmote?.timestamp]);

  if (!gameState) {
    return <div className="flex items-center justify-center h-screen bg-green-900 text-white"><p>No game in progress.</p></div>;
  }

  const { players, pile, deck, currentPlayerIndex, validMoves, bestMove, phase } = gameState;
  const [human, bot1, bot2, bot3] = players;
  const isPreparing = phase === 'PREPARATION';
  const cannotPlay = gameStarted && isPlayerTurn && !isPreparing && !pendingAce && validMoves.length === 0;
  const pileTop3 = pile.slice(-3);

  function handleCardClick(card: Card) {
    if (isPreparing || !isPlayerTurn || pendingAce) return;
    const isHiddenPlay = human.hand.length === 0 && human.visibleCards.length === 0;
    if (card.rank === 'A' && !isHiddenPlay) { setPendingAce(card); return; }
    setSelectedCards(prev => {
      if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].rank !== card.rank) return [card];
      return [...prev, card];
    });
  }

  function handlePileClick() {
    if (selectedCards.length > 0 && !pendingAce) {
      playCards(selectedCards);
      setSelectedCards([]);
    }
  }

  function BotZone({ player, idx }: { player: Player; idx: number }) {
    return (
      <div className="relative flex justify-center">
        {activeBubbles[player.id] && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1 text-xl animate-bounce z-10">
            {activeBubbles[player.id]}
          </div>
        )}
        <PlayerZone player={player} isCurrentPlayer={currentPlayerIndex === idx} isHuman={false}
          isPreparing={false} cannotPlay={false} validMoves={[]} bestMove={null} selectedCardIds={[]} onCardClick={() => {}} onSwap={() => {}} />
        {pendingAce && (
          <button onClick={() => { playCards([pendingAce!], player.id); setPendingAce(null); }}
            className="absolute inset-0 flex items-center justify-center bg-red-500/40 hover:bg-red-500/60 rounded-lg border-2 border-red-400 transition-colors">
            <span className="text-white font-bold text-sm drop-shadow">⚔ Attaquer</span>
          </button>
        )}
      </div>
    );
  }

  const pileRingClass = selectedCards.length > 0 && !pendingAce ? 'ring-2 ring-blue-400 animate-pulse' : '';

  return (
    <div className="relative min-h-screen bg-green-900 flex items-center justify-center p-4">
      {stateHistory.length > 0 && phase === 'PLAYING' && (
        <button onClick={undoLastMove} className="absolute top-2 right-2 px-3 py-1 bg-black/40 hover:bg-black/60 text-white/70 text-xs rounded border border-white/20">↩ Retour</button>
      )}
      <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full max-w-3xl">
        <div /><div><BotZone player={bot2} idx={2} /></div><div />
        <div><BotZone player={bot1} idx={1} /></div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/60 text-xs">Pile ({pile.length})</span>
            <div className={`relative w-16 h-[89px] cursor-pointer rounded-md ${pileRingClass}`} onClick={handlePileClick}>
              {pile.length === 0 && <GameCard card={null} state="empty" />}
              {pileTop3.length >= 3 && <div className="absolute inset-0 -rotate-6 -translate-x-4 opacity-60"><GameCard card={pileTop3[0]} state="normal" /></div>}
              {pileTop3.length >= 2 && <div className="absolute inset-0 -rotate-3 -translate-x-2 opacity-80"><GameCard card={pileTop3[pileTop3.length - 2]} state="normal" /></div>}
              {pileTop3.length >= 1 && <div className="absolute inset-0"><GameCard card={pileTop3[pileTop3.length - 1]} state="normal" /></div>}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/60 text-xs">Deck ({deck.length})</span>
            {deck.length === 0
              ? <div className="w-16 h-[89px] rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-sm">0</div>
              : <GameCard card={null} state="hidden" />}
          </div>
        </div>

        <div><BotZone player={bot3} idx={3} /></div>
        <div />

        <div className="relative flex flex-col items-center gap-2">
          {activeBubbles['human'] && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1 text-xl animate-bounce z-10">
              {activeBubbles['human']}
            </div>
          )}
          <PlayerZone player={human} isCurrentPlayer={currentPlayerIndex === 0} isHuman={true}
            isPreparing={isPreparing} cannotPlay={cannotPlay} validMoves={pendingAce ? [] : validMoves}
            bestMove={pendingAce ? null : bestMove} selectedCardIds={selectedCards.map(c => c.id)}
            onCardClick={handleCardClick} onSwap={swapCard} />
          {isPreparing && (
            <div className="px-4 py-3 bg-black/50 rounded-lg border border-yellow-500/40 flex flex-col items-center gap-2">
              <p className="text-yellow-300 text-sm font-medium">Phase de préparation — échangez vos cartes</p>
              <button className="px-5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded text-sm" onClick={setReady}>Je suis prêt ✓</button>
            </div>
          )}
          {pendingAce && (
            <div className="px-4 py-2 bg-black/60 rounded-lg border border-red-400/60 flex items-center gap-3">
              <span className="text-red-300 text-sm font-medium">Choisissez un joueur à attaquer</span>
              <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded" onClick={() => setPendingAce(null)}>Annuler</button>
            </div>
          )}
          {cannotPlay && pile.length > 0 && (
            <button className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm ring-2 ring-red-400 animate-pulse" onClick={takePile}>Ramasser la pile 📥</button>
          )}
          <EmoteWheel onEmote={emote => sendEmote('human', emote)} />
        </div>
        <div />
      </div>
    </div>
  );
}
