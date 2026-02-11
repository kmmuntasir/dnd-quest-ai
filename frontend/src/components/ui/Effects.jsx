import { useEffect, useState } from 'react';

export function MistEffect({ opacity = 0.3 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate mist particles
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.1
    }));
    setParticles(newParticles);

    // Animate particles
    const animate = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.speedX,
          y: p.y + p.speedY,
          opacity: p.opacity * (1 + Math.sin(Date.now() / 2000) * 0.3)
        }))
      );
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animate);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-br from-white/20 to-transparent blur-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity * opacity,
            filter: 'blur(2px)',
            animation: `float ${3 + p.speedY * 10}s ease-in-out infinite alternate`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}

export function GlowEffect({ children, color = 'accent-gold' }) {
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    setGlowing(true);
    const timer = setTimeout(() => setGlowing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      <div
        className={`absolute inset-0 blur-xl opacity-50 transition-opacity duration-1000 ${
          glowing ? 'bg-accent-gold' : ''
        }`}
      />
      <div className={`relative transition-transform duration-300 ${glowing ? 'scale-105' : 'scale-100'}`}>
        {children}
      </div>
    </div>
  );
}

export function SparkleEffect({ children, trigger = false }) {
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShowSparkles(true);
      const timer = setTimeout(() => setShowSparkles(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className="relative">
      {children}
      {showSparkles && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent-gold rounded-full animate-ping"
              style={{
                left: `${20 + i * 12}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default { MistEffect, GlowEffect, SparkleEffect };
