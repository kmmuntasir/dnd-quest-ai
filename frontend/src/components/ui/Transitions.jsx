import { useEffect, useState } from 'react';

export function SceneTransition({ isActive, duration = 1000, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(false);
      const timer = setTimeout(() => {
        setVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!isActive) {
    return null;
  }

  return (
    <div className={`relative transition-all duration-[${duration}ms] ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {children}
    </div>
  );
}

export function FadeIn({ delay = 0, duration = 500, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-${duration} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
}

export function SlideUp({ children, delay = 0, duration = 500 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-${duration} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ children, delay = 0, duration = 300 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-${duration} ${
        visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

export default { SceneTransition, FadeIn, SlideUp, ScaleIn };
