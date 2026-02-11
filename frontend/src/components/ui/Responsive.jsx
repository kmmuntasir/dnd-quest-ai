import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';

export function MobileMenu({ children, isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Mobile Menu */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-full bg-background-dark transform transition-transform duration-300 ease-out ${
          isOpen && !isClosing ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-background-card">
          <span className="font-display text-xl font-bold text-white">
            Menu
          </span>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}

export function ResponsiveContainer({ children, className = '' }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto px-4 ${className}`}>
      {children}
    </div>
  );
}

export function Breakpoint({ mobile = null, tablet = null, desktop = null, children }) {
  const [breakpoint, setBreakpoint] = useState('mobile');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return (
    <>
      {breakpoint === 'mobile' && mobile}
      {breakpoint === 'tablet' && tablet}
      {breakpoint === 'desktop' && desktop}
    </>
  );
}

export function MobileNav({ isOpen, onToggle, children }) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 p-4 bg-background-dark/90 backdrop-blur-sm border-b border-background-card">
      <div className="flex items-center justify-between">
        {children}
        <button
          onClick={onToggle}
          className="text-white p-2 hover:bg-background-card rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

export default { MobileMenu, ResponsiveContainer, Breakpoint, MobileNav };
