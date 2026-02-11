import { clsx } from 'clsx';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const classes = clsx('animate-spin', sizeStyles[size], className);

  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 4.311 3.367 7.91 7.547 8.45l-3.06-1.257z"
      />
    </svg>
  );
}

export function LoadingPage({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-darker">
      <div className="text-center">
        <LoadingSpinner size="xl" className="text-accent-gold mb-4" />
        <p className="text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
