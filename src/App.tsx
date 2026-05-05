import { useEffect, useState, lazy, Suspense } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { MemberCard } from '@/features/game/components/MemberCard';
import { LandingPage } from '@/features/landing/LandingPage';
import { useGameStore } from '@/features/game/store/gameStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

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

  const { setUser, setProfile, setIsLoading, isLoading, user } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);

      if(session?.user) {
        supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile }) => {
          setProfile(profile);
          setIsLoading(false);
        });
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
  }, []);

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
  if (cleanPath === '/profile') {
    if(isLoading) return <div>Chargement...</div>
    if(!user) {
      navigate('/');  
      return null;
    }
    return <ProfilePage />;
  }
  if (cleanPath === '/debug' && DebugPage) return <Suspense fallback={null}><DebugPage /></Suspense>;

  return <LandingPage onNavigate={navigate} />;
}

export default App;
