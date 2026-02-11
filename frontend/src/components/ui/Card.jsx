import { clsx } from 'clsx';

export function Card({ children, className = '', hover = false, ...props }) {
  const baseStyles = 'bg-background-card rounded-xl border border-background-input';
  const hoverStyles = hover ? 'hover:border-background-input/50 hover:shadow-lg transition-all' : '';

  const classes = clsx(baseStyles, hoverStyles, className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`p-6 border-b border-background-input ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-6 border-t border-background-input bg-background-dark/30 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
