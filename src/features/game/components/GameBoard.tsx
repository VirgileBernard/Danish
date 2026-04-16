import { useEffect, useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { useGameLog } from '@/features/game/hooks/useGameLog';
import { PlayerZone } from './PlayerZone';
import { GameCard } from './GameCard';
import { EndScreen } from './EndScreen';
import type { Card, Player } from '@/features/game/utils/types';

const EMOTES = ['😊', '😐', '😍', '😵'];

export function GameBoard() {
  const { gameState, isPlayerTurn, playCards, swapCard, setReady, triggerBotTurn,
    takePile, passTurn, undoLastMove, stateHistory, sendEmote, resetGame, startGame, difficulty } = useGameStore();
  const [pendingAce, setPendingAce] = useState<Card | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [hiddenPending, setHiddenPending] = useState<Card | null>(null);
  const [revealingHidden, setRevealingHidden] = useState<Card | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [invalidMsg, setInvalidMsg] = useState<string | null>(null);
  const [showEnd, setShowEnd] = useState(true);
  const { entries: gameLog, push: addLog } = useGameLog(gameState, isPlayerTurn);

  useEffect(() => {
    if (!gameState || gameState.phase !== 'PLAYING' || isPlayerTurn) return;
    const t = setTimeout(triggerBotTurn, 800);
    return () => clearTimeout(t);
  }, [gameState, isPlayerTurn, triggerBotTurn]);

  useEffect(() => { if (!isPlayerTurn) { setPendingAce(null); setSelectedCards([]); setHiddenPending(null); setRevealingHidden(null); } }, [isPlayerTurn]);
  useEffect(() => {
    if (gameState?.phase !== 'PLAYING') { setGameStarted(false); return; }
    const t = setTimeout(() => setGameStarted(true), 500);
    return () => clearTimeout(t);
  }, [gameState?.phase]);
  useEffect(() => { if (gameState?.phase === 'PREPARATION') setShowEnd(true); }, [gameState?.phase]);

  const lastEmote = gameState?.emotes.at(-1);
  useEffect(() => {
    if (!lastEmote) return;
    setBubbles(p => ({ ...p, [lastEmote.playerId]: lastEmote.emote }));
    const t = setTimeout(() => setBubbles(p => { const n = { ...p }; delete n[lastEmote.playerId]; return n; }), 3000);
    return () => clearTimeout(t);
  }, [lastEmote?.timestamp]);

  if (!gameState) return <div className="flex items-center justify-center h-screen bg-green-900 text-white"><p>No game in progress.</p></div>;

  const { players, pile, deck, currentPlayerIndex, validMoves, bestMove, phase, finishOrder, turnContext } = gameState;
  const [human, bot1, bot2, bot3] = players;
  const isPreparing = phase === 'PREPARATION';
  const inHiddenMode = human.hand.length === 0 && human.visibleCards.length === 0 && human.hiddenCards.length > 0;
  const cannotPlay = gameStarted && isPlayerTurn && !isPreparing && !pendingAce
    && validMoves.length === 0 && !inHiddenMode;
  const canPassTurn = cannotPlay && pile.length === 0;
  const pileTop3 = pile.slice(-3);

  function handleCardClick(card: Card) {
    if (isPreparing || !isPlayerTurn || pendingAce) return;
    if (inHiddenMode) {
      setHiddenPending(card);
      return;
    }
    setSelectedCards(prev => prev.some(c => c.id === card.id) ? prev.filter(c => c.id !== card.id)
      : prev.length > 0 && prev[0].rank !== card.rank ? [card] : [...prev, card]);
  }

  function handlePileClick() {
    if (revealingHidden) return;
    if (inHiddenMode) {
      if (!hiddenPending) return;
      const card = hiddenPending;
      setHiddenPending(null);
      setRevealingHidden(card);
      window.setTimeout(() => {
        setRevealingHidden(null);
        if (card.rank === 'A') {
          setSelectedCards([card]);
          setPendingAce(card);
        } else {
          playCards([card]);
        }
      }, 700);
      return;
    }
    if (!selectedCards.length || pendingAce) return;
    if (selectedCards.some(c => c.rank === 'A')) {
      setPendingAce(selectedCards.find(c => c.rank === 'A')!); return;
    }
    if (selectedCards.every(c => c.rank === '3') && turnContext.lastEffectiveCard?.rank === 'A') {
      setPendingAce(selectedCards[0]); return;
    }
    if (!playCards(selectedCards)) {
      const effectiveCard = turnContext.lastEffectiveCard ?? pile.at(-1);
      setInvalidMsg(`Tu ne peux pas jouer ${selectedCards[0].rank} sur ${effectiveCard?.rank ?? 'vide'}`);
      setTimeout(() => setInvalidMsg(null), 2500);
    } else { addLog(`Tu joues ${selectedCards[0].rank}`); setSelectedCards([]); }
  }

  function Bubble({ id }: { id: string }) {
    return bubbles[id] ? <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-2 py-1 text-xl z-10">{bubbles[id]}</div> : null;
  }

  function BotZone({ player, idx }: { player: Player; idx: number }) {
    return (
      <div className="relative flex justify-center">
        <Bubble id={player.id} />
        <PlayerZone player={player} isCurrentPlayer={currentPlayerIndex === idx} isHuman={false}
          isPreparing={false} cannotPlay={false} validMoves={[]} bestMove={null} selectedCardIds={[]} onCardClick={() => {}} onSwap={() => {}} />
        {pendingAce && <button onClick={() => { playCards(selectedCards, player.id); setPendingAce(null); setSelectedCards([]); }}
          className="absolute inset-0 flex items-center justify-center bg-red-500/40 hover:bg-red-500/60 rounded-lg border-2 border-red-400 transition-colors">
          <span className="text-white font-bold text-sm drop-shadow">⚔ Attaquer</span></button>}
      </div>
    );
  }

  const pileRing = (selectedCards.length > 0 || hiddenPending) && !pendingAce ? 'ring-2 ring-blue-400 animate-pulse' : '';

  return (
    <div className="relative h-screen overflow-hidden bg-green-900 flex flex-col">
      {finishOrder.includes('human') && showEnd && <EndScreen players={players} finishOrder={finishOrder}
        humanId="human" onHide={() => setShowEnd(false)} onReplay={() => { resetGame(); startGame(human?.name ?? 'Joueur', difficulty); }} />}
      {stateHistory.length > 0 && phase === 'PLAYING' && (
        <button onClick={undoLastMove} className="absolute top-2 right-2 px-3 py-1 bg-black/40 hover:bg-black/60 text-white/70 text-xs rounded border border-white/20 z-30">↩ Retour</button>
      )}

      {/* ── Row 1 : Bot top — 36vh fixed ── */}
      <div className="flex-none flex items-end justify-center pt-16 pb-2" style={{ height: '36vh' }}>
        <BotZone player={bot2} idx={2} />
      </div>

      {/* ── Row 2 : Centre — compressible, min 14vh ── */}
      <div className="flex items-center justify-center gap-12" style={{ minHeight: '14vh', flex: '1 1 0%' }}>
        <BotZone player={bot1} idx={1} />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">Pile ({pile.length})</span>
              <div className={`relative w-16 h-[89px] cursor-pointer rounded-md ${pileRing}`} onClick={handlePileClick}>
                {pile.length === 0 && !revealingHidden && <GameCard card={null} state="empty" />}
                {pileTop3.length >= 3 && <div className="absolute inset-0 -rotate-6 -translate-x-4 opacity-60"><GameCard card={pileTop3[0]} state="normal" /></div>}
                {pileTop3.length >= 2 && <div className="absolute inset-0 -rotate-3 -translate-x-2 opacity-80"><GameCard card={pileTop3[pileTop3.length - 2]} state="normal" /></div>}
                {pileTop3.length >= 1 && <div className="absolute inset-0"><GameCard card={pileTop3[pileTop3.length - 1]} state="normal" /></div>}
                {revealingHidden && <div className="absolute inset-0 ring-2 ring-yellow-400 rounded-md animate-pulse"><GameCard card={revealingHidden} state="normal" /></div>}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">Deck ({deck.length})</span>
              {deck.length === 0 ? <div className="w-16 h-[89px] rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-sm">0</div>
                : <GameCard card={null} state="hidden" />}
            </div>
          </div>
          {cannotPlay && pile.length > 0 && <button className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm ring-2 ring-red-400 animate-pulse" onClick={takePile}>Ramasser la pile 📥</button>}
          {canPassTurn && <button className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded text-sm ring-2 ring-yellow-400 animate-pulse" onClick={passTurn}>Passer son tour ⏭</button>}
          {invalidMsg && <div className="px-3 py-1 bg-red-900/80 text-red-200 text-xs rounded-full">{invalidMsg}</div>}
        </div>
        <BotZone player={bot3} idx={3} />
      </div>

      {/* ── Row 3 : Human player zone — shrink-wraps content, no fixed height ── */}
      <div className="flex-none flex flex-col items-center justify-start pt-2 overflow-visible">
        <div className="relative flex flex-col items-center gap-2 overflow-visible">
          <Bubble id="human" />
          <PlayerZone player={human} isCurrentPlayer={currentPlayerIndex === 0} isHuman={true}
            isPreparing={isPreparing} cannotPlay={cannotPlay} validMoves={pendingAce ? [] : validMoves}
            bestMove={pendingAce ? null : bestMove} selectedCardIds={selectedCards.map(c => c.id)}
            onCardClick={handleCardClick} onSwap={swapCard} />
          {isPreparing && <div className="px-4 py-3 bg-black/50 rounded-lg border border-yellow-500/40 flex flex-col items-center gap-2"><p className="text-yellow-300 text-sm font-medium">Phase de préparation — échangez vos cartes</p><button className="px-5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded text-sm" onClick={setReady}>Je suis prêt ✓</button></div>}
          {pendingAce && <div className="px-4 py-2 bg-black/60 rounded-lg border border-red-400/60 flex items-center gap-3"><span className="text-red-300 text-sm font-medium">Choisissez un joueur à attaquer</span><button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded" onClick={() => setPendingAce(null)}>Annuler</button></div>}
        </div>
      </div>

      {/* ── Row 4 : Bottom bar (emotes left · log right) — 10vh fixed ── */}
      <div className="flex-none flex items-end justify-between px-4 pb-3" style={{ height: '10vh' }}>
        {/* Emotes — 2×2 grid, emoji only */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/30 p-1.5">
          {EMOTES.map(e => (
            <button key={e} className="flex items-center justify-center w-12 h-12 rounded-md hover:bg-white/10 transition-colors"
              onClick={() => sendEmote('human', e)}>
              <span className="text-[36px] leading-none">{e}</span>
            </button>
          ))}
        </div>

        {/* Game log — bottom-right */}
        <div className="flex flex-col gap-1.5" style={{ width: 300 }}>
          {gameLog.slice(0, 4).map((entry, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg text-base ${i === 0 ? 'bg-black/70 text-white' : 'bg-black/40 text-white/60'}`}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
