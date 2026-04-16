// Entry point — routes between the major screens of the app.
// Phase 1: game vs bots only. Phase 2 will add tournament + feed routes.
import { useEffect, useState, lazy, Suspense } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { MemberCard } from '@/features/game/components/MemberCard';
import { useGameStore } from '@/features/game/store/gameStore';

const DebugPage = import.meta.env.DEV ? lazy(() => import('@/features/game/components/DebugPage').then(m => ({ default: m.DebugPage }))) : null;

function GameRoute() {
  const { gameState, startGame } = useGameStore();

  useEffect(() => {
    if (!gameState) startGame('You', 'medium');
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
  if (path === '/game') return <GameRoute />;
  if (path === '/profile') return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4"><MemberCard /></div>;
  if (path === '/debug' && DebugPage) return <Suspense fallback={null}><DebugPage /></Suspense>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold">Danish 🃏</h1>
        <a href="/game" className="px-6 py-2 bg-green-700 hover:bg-green-600 rounded text-white font-semibold">
          Play
        </a>
      </div>
    </div>
  );
}

export default App;
