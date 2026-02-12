import { clsx } from 'clsx';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all transform active:scale-95';
  
  const variantStyles = {
    primary: 'bg-primary-default hover:bg-primary-hover text-white',
    secondary: 'bg-background-card hover:bg-background-input text-white border border-background-input',
    danger: 'bg-accent-red hover:bg-red-700 text-white'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';

  const classes = clsx(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    disabled && disabledStyles,
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 4.311 3.367 7.91 7.547 8.45l-3.06-1.257z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
