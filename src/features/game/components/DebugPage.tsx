import { useState } from 'react';
import { createDeck } from '@/features/game/utils/deck';
import { getValidMoves, getBestMove } from '@/features/game/utils/cardRules';
import { useGameStore } from '@/features/game/store/gameStore';
import type { Card, GameState, TurnContext } from '@/features/game/utils/types';

const ALL_CARDS = createDeck();
const RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_LABELS: Record<Card['suit'], string> = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const SUIT_COLORS: Record<Card['suit'], string> = { hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-white', spades: 'text-white' };

function findCard(rank: Card['rank'], suit: Card['suit']): Card {
  return ALL_CARDS.find(c => c.rank === rank && c.suit === suit)!;
}

function CardGrid({
  selected,
  disabled,
  max,
  onToggle,
  label,
}: {
  selected: Card[];
  disabled: Set<string>;
  max: number;
  onToggle: (card: Card) => void;
  label: string;
}) {
  const selectedIds = new Set(selected.map(c => c.id));
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">{label} ({selected.length}/{max})</h2>
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${RANKS.length}, minmax(0, 1fr))` }}>
        {SUITS.map(suit =>
          RANKS.map(rank => {
            const card = findCard(rank, suit);
            const isSelected = selectedIds.has(card.id);
            const isDisabled = disabled.has(card.id);
            const atMax = selected.length >= max && !isSelected;
            return (
              <button
                key={card.id}
                onClick={() => !isDisabled && !atMax && onToggle(card)}
                disabled={isDisabled || atMax}
                className={`px-1 py-0.5 text-xs font-mono rounded transition-colors ${
                  isDisabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : isSelected ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                  : atMax ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 cursor-pointer'
                }`}
              >
                <span className={isDisabled ? 'text-gray-600' : SUIT_COLORS[suit]}>{rank}{SUIT_LABELS[suit]}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function RankSuitPicker({
  label,
  rank,
  suit,
  onRankChange,
  onSuitChange,
  onClear,
}: {
  label: string;
  rank: Card['rank'] | null;
  suit: Card['suit'];
  onRankChange: (r: Card['rank'] | null) => void;
  onSuitChange: (s: Card['suit']) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300 w-36">{label}</span>
      <select
        value={rank ?? ''}
        onChange={e => onRankChange(e.target.value === '' ? null : e.target.value as Card['rank'])}
        className="bg-gray-700 text-white text-sm rounded px-2 py-1"
      >
        <option value="">aucune</option>
        {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      {rank && (
        <select
          value={suit}
          onChange={e => onSuitChange(e.target.value as Card['suit'])}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1"
        >
          {SUITS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {rank && <button onClick={onClear} className="text-xs text-gray-400 hover:text-white">x</button>}
    </div>
  );
}

export function DebugPage() {
  const [hand, setHand] = useState<Card[]>([]);
  const [visible, setVisible] = useState<Card[]>([]);
  const [hidden, setHidden] = useState<Card[]>([]);

  // Pile card
  const [pileRank, setPileRank] = useState<Card['rank'] | null>(null);
  const [pileSuit, setPileSuit] = useState<Card['suit']>('hearts');

  // TurnContext fields
  const [mustPlayBelow7, setMustPlayBelow7] = useState(false);
  const [mustFollowSuit, setMustFollowSuit] = useState<Card['suit'] | 'none'>('none');
  const [mustFollowAboveValue, setMustFollowAboveValue] = useState(0);
  const [mustPlayDouble, setMustPlayDouble] = useState(false);
  const [lastEffRank, setLastEffRank] = useState<Card['rank'] | null>(null);
  const [lastEffSuit, setLastEffSuit] = useState<Card['suit']>('hearts');
  const [attackTarget, setAttackTarget] = useState<string>('none');

  const [error, setError] = useState<string | null>(null);

  const handIds = new Set(hand.map(c => c.id));
  const visibleIds = new Set(visible.map(c => c.id));
  const disabledForVisible = handIds;
  const disabledForHidden = new Set([...handIds, ...visibleIds]);

  function toggle(setList: React.Dispatch<React.SetStateAction<Card[]>>, card: Card) {
    setList(prev => prev.some(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]);
  }

  function launch() {
    setError(null);

    // Validate no overlap
    const allIds = [...hand, ...visible, ...hidden].map(c => c.id);
    if (new Set(allIds).size !== allIds.length) {
      setError('Une carte apparait dans plusieurs zones.');
      return;
    }

    const config = { mode: 'patriarchal' as const };
    const stats = { gamesPlayed: 0, placements: [0, 0, 0, 0] as [number, number, number, number], achievements: [] as string[] };

    // Build deck excluding human's cards + pile card
    const reservedIds = new Set([...hand, ...visible, ...hidden].map(c => c.id));
    const pileCard: Card | null = pileRank ? findCard(pileRank, pileSuit) : null;
    if (pileCard) reservedIds.add(pileCard.id);
    const shuffled = ALL_CARDS.filter(c => !reservedIds.has(c.id));

    // Deal 9 cards per bot (3 hidden + 3 visible + 3 hand)
    const bot1Cards = shuffled.slice(0, 9);
    const bot2Cards = shuffled.slice(9, 18);
    const bot3Cards = shuffled.slice(18, 27);
    const remainingDeck = shuffled.slice(27);

    const players = [
      { id: 'human', name: 'Debug', title: 'Debugger', isBot: false, isReady: true, isFinished: false, hand, visibleCards: visible, hiddenCards: hidden, stats },
      { id: 'bot-1', name: 'Bot 1', title: 'Bot', isBot: true, isReady: true, isFinished: false, hand: bot1Cards.slice(6, 9), visibleCards: bot1Cards.slice(3, 6), hiddenCards: bot1Cards.slice(0, 3), stats },
      { id: 'bot-2', name: 'Bot 2', title: 'Bot', isBot: true, isReady: true, isFinished: false, hand: bot2Cards.slice(6, 9), visibleCards: bot2Cards.slice(3, 6), hiddenCards: bot2Cards.slice(0, 3), stats },
      { id: 'bot-3', name: 'Bot 3', title: 'Bot', isBot: true, isReady: true, isFinished: false, hand: bot3Cards.slice(6, 9), visibleCards: bot3Cards.slice(3, 6), hiddenCards: bot3Cards.slice(0, 3), stats },
    ];

    const pile: Card[] = pileCard ? [pileCard] : [];
    const lastEffectiveCard: Card | null = lastEffRank ? findCard(lastEffRank, lastEffSuit) : null;

    const turnContext: TurnContext = {
      mustPlayDouble,
      mustFollowSuit: mustFollowSuit === 'none' ? null : mustFollowSuit,
      mustFollowAboveValue: mustFollowSuit !== 'none' ? mustFollowAboveValue : null,
      mustPlayBelow7,
      lastEffectiveCard,
      consecutiveSameValue: 0,
      lastPlayedValue: lastEffectiveCard ? lastEffectiveCard.value : null,
      skippedPlayers: 0,
      attackTarget: attackTarget === 'none' ? null : attackTarget,
    };

    const gs: GameState = {
      phase: 'PLAYING',
      players,
      currentPlayerIndex: 0,
      deck: remainingDeck,
      pile,
      discard: [],
      turnContext,
      config,
      helperActive: false,
      validMoves: [],
      bestMove: null,
      emotes: [],
      finishOrder: [],
    };

    const final: GameState = {
      ...gs,
      validMoves: getValidMoves(players[0], gs),
      bestMove: getBestMove(players[0], gs),
    };

    useGameStore.setState({ gameState: final, isPlayerTurn: true, stateHistory: [] });
    // Push without reload to preserve Zustand state, then trigger App re-render
    window.history.pushState({}, '', '/game');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug — Scenario Builder</h1>
        <a href="/" className="text-sm text-gray-400 hover:text-white">Retour</a>
      </div>

      <CardGrid label="Ma main" selected={hand} disabled={new Set()} max={3} onToggle={c => toggle(setHand, c)} />
      <CardGrid label="Mes cartes visibles" selected={visible} disabled={disabledForVisible} max={3} onToggle={c => toggle(setVisible, c)} />
      <CardGrid label="Mes cartes cachees" selected={hidden} disabled={disabledForHidden} max={3} onToggle={c => toggle(setHidden, c)} />

      <div className="flex flex-col gap-3 bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold">Etat de la pile / TurnContext</h2>

        <RankSuitPicker label="Carte sur la pile" rank={pileRank} suit={pileSuit} onRankChange={setPileRank} onSuitChange={setPileSuit} onClear={() => setPileRank(null)} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mustPlayBelow7} onChange={e => setMustPlayBelow7(e.target.checked)} className="accent-blue-500" />
          mustPlayBelow7
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-36">mustFollowSuit</span>
          <select value={mustFollowSuit} onChange={e => setMustFollowSuit(e.target.value as Card['suit'] | 'none')} className="bg-gray-700 text-white text-sm rounded px-2 py-1">
            <option value="none">none</option>
            {SUITS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {mustFollowSuit !== 'none' && (
            <>
              <span className="text-sm text-gray-300">aboveValue</span>
              <input type="number" value={mustFollowAboveValue} onChange={e => setMustFollowAboveValue(Number(e.target.value))} className="bg-gray-700 text-white text-sm rounded px-2 py-1 w-16" />
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mustPlayDouble} onChange={e => setMustPlayDouble(e.target.checked)} className="accent-blue-500" />
          mustPlayDouble
        </label>

        <RankSuitPicker label="lastEffectiveCard" rank={lastEffRank} suit={lastEffSuit} onRankChange={setLastEffRank} onSuitChange={setLastEffSuit} onClear={() => setLastEffRank(null)} />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-36">attackTarget</span>
          <select value={attackTarget} onChange={e => setAttackTarget(e.target.value)} className="bg-gray-700 text-white text-sm rounded px-2 py-1">
            <option value="none">none</option>
            <option value="bot-1">Bot 1</option>
            <option value="bot-2">Bot 2</option>
            <option value="bot-3">Bot 3</option>
          </select>
        </div>
      </div>

      {error && <div className="px-4 py-2 bg-red-900/80 text-red-200 rounded text-sm">{error}</div>}

      <button onClick={launch} className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-lg">
        Lancer le scenario
      </button>
    </div>
  );
}
