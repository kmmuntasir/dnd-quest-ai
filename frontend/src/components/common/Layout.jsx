import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Gamepad2, Settings } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/library', label: 'Story Library', icon: BookOpen },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-background-darker text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-dark/90 backdrop-blur-sm border-b border-background-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-accent-gold hover:text-accent-gold/80 transition-colors">
            <Gamepad2 className="w-8 h-8" />
            <span className="font-display text-2xl font-bold">D&D AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-default text-white'
                      : 'text-gray-300 hover:bg-background-card hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden text-white hover:text-accent-gold transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-background-dark/50 border-t border-background-card py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-fantasy text-accent-gold">
            Dungeons & Dragons AI
          </p>
          <p className="text-sm mt-2">
            Powered by Groq & Pollinations.ai
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
