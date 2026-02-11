import { forwardRef, useId } from 'react';

// Accessible checkbox component
export const A11yCheckbox = forwardRef(({ label, id, checked, onChange, disabled = false, ...props }, ref) => {
  const generatedId = useId();

  return (
    <div className="flex items-start gap-3">
      <input
        ref={ref}
        type="checkbox"
        id={id || generatedId}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-5 h-5 rounded border-background-input focus:ring-2 focus:ring-primary-default/20 focus:ring-offset-2 bg-background-input text-accent-gold transition-all cursor-pointer"
        {...props}
      />
      <label
        htmlFor={id || generatedId}
        className={`text-sm font-medium text-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {label}
      </label>
    </div>
  );
});

A11yCheckbox.displayName = 'A11yCheckbox';

// Accessible modal trap focus
export function useFocusTrap(isOpen) {
  React.useEffect(() => {
    if (isOpen) {
      const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const firstElement = document.querySelector(focusableElements);
      const lastElement = document.querySelectorAll(focusableElements)[document.querySelectorAll(focusableElements).length - 1];

      const handleTab = (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          if (e.shiftKey) {
            lastElement?.focus();
          } else {
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);
}

// Skip link for screen readers
export function SkipToContent({ targetId = 'main-content', label = 'Skip to main content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary-default focus:text-white rounded-lg"
    >
      {label}
    </a>
  );
}

// Live region for dynamic content
export function LiveRegion({ children, id, ariaLabel, ariaLive = 'polite' }) {
  return (
    <div id={id} aria-live={ariaLive} aria-label={ariaLabel} className="sr-only" role="status">
      {children}
    </div>
  );
}

// Screen reader only content
export function VisuallyHidden({ children }) {
  return (
    <span className="sr-only" aria-hidden="true">
      {children}
    </span>
  );
}

export default { A11yCheckbox, useFocusTrap, SkipToContent, LiveRegion, VisuallyHidden };
