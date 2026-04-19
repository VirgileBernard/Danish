import { useEffect, useState, lazy, Suspense } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { MemberCard } from '@/features/game/components/MemberCard';
import { LobbyPage } from '@/features/lobby/LobbyPage';
import { useGameStore } from '@/features/game/store/gameStore';

const DebugPage = import.meta.env.DEV ? lazy(() => import('@/features/game/components/DebugPage').then(m => ({ default: m.DebugPage }))) : null;

function GameRoute() {
  const { gameState, startGame, difficulty } = useGameStore();

  useEffect(() => {
    if (!gameState) startGame('You', difficulty);
  }, []);

  return <GameBoard />;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(to: string) {
    const url = import.meta.env.BASE_URL.replace(/\/$/, '') + to;
    history.pushState({}, '', url);
    setPath(url);
  }

  const base = import.meta.env.BASE_URL;
  const cleanPath = path.replace(base.replace(/\/$/, ''), '') || '/';

  if (cleanPath === '/game') return <GameRoute />;
  if (cleanPath === '/profile') return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4"><MemberCard /></div>;
  if (cleanPath === '/debug' && DebugPage) return <Suspense fallback={null}><DebugPage /></Suspense>;

  return <LobbyPage onNavigate={navigate} />;
}

export default App;
