import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home, BookOpen, Gamepad2, Settings, Menu, X } from 'lucide-react';
import { MobileMenu } from '../ui/Responsive';

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/library', label: 'Story Library', icon: BookOpen },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Nav */}
      <nav className="lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 right-4 z-50 text-white p-2 hover:text-accent-gold transition-colors bg-background-dark/80 backdrop-blur-sm rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <div className="space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-default text-white'
                    : 'text-gray-300 hover:bg-background-card hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-display text-lg">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </MobileMenu>

      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-background-dark/90 backdrop-blur-sm border-b border-background-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-accent-gold hover:text-accent-gold/80 transition-colors">
            <Gamepad2 className="w-8 h-8" />
            <span className="font-display text-2xl font-bold hidden sm:inline">D&D AI</span>
            <span className="font-display text-xl font-bold lg:hidden">D&D AI</span>
          </Link>

          <nav className="flex items-center gap-6">
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
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 lg:pt-20 min-h-screen bg-gradient-to-b from-background-dark via-background-dark to-background-darker">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-background-dark/50 border-t border-background-card py-4 lg:py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-fantasy text-lg lg:text-xl text-accent-gold mb-1 lg:mb-2">
            Dungeons & Dragons AI
          </p>
          <p className="text-xs sm:text-sm">
            Powered by Groq & Pollinations.ai
          </p>
        </div>
      </footer>
    </>
  );
}

export default Layout;
