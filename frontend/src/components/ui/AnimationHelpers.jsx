import { useState } from 'react';
import { SparkleEffect } from './Effects';

// Higher-order component for hover effects
export function withHoverEffect(Component, options = {}) {
  return function HoverEffectComponent(props) {
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    const handleClick = () => {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 300);
    };

    return (
      <Component
        {...props}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`${props.className || ''} ${
          isHovered ? options.hoverClass || 'scale-105 shadow-lg' : ''
        } ${isClicked ? 'scale-95' : ''} transition-all duration-200`}
      />
    );
  };
}

// Stagger children with animation delays
export function StaggerChildren({ children, delay = 100, as = 'div' }) {
  const ChildComponent = as;

  return (
    <>
      {children.map((child, index) => (
        <ChildComponent
          key={index}
          style={{
            animation: `fadeInUp 0.6s ease-out ${delay * index}ms both`
          }}
          className="inline-block"
        >
          {child}
        </ChildComponent>
      ))}
    </>
  );
}

// Animated counter
export function AnimatedCounter({ value, duration = 2000 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = 0;
    const endValue = value;
    const range = endValue - startValue;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.floor(startValue + range * progress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="font-display font-bold tabular-nums">
      {displayValue}
    </span>
  );
}

// Ripple effect on click
export function RippleButton({ children, onClick, className = '', ...props }) {
  const [ripple, setRipple] = useState(null);

  const handleClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = { x, y, size };
    setRipple(newRipple);

    setTimeout(() => setRipple(null), 600);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      {ripple && (
        <span
          className="absolute rounded-full bg-white/30 animate-ping"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: `${ripple.size}px`,
            height: `${ripple.size}px`
          }}
        />
      )}
    </button>
  );
}

export default {
  withHoverEffect,
  StaggerChildren,
  AnimatedCounter,
  RippleButton
};
