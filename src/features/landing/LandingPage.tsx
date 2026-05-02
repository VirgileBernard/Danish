// import { useTheme } from './hooks/useTheme';
// import { ThemeToggle } from './components/ThemeToggle';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
export function LandingPage({ onNavigate }:LandingPageProps) {
  
// const { theme, toggleTheme } = useTheme();
//    console.log('Current theme:', theme);  
  
  return (
    <div>
      <Nav />
      <Hero />
    </div>
  );
}