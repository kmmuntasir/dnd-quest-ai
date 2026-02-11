import { clsx } from 'clsx';

export function Skeleton({ className = '', variant = 'default' }) {
  const variantStyles = {
    default: 'bg-background-input',
    text: 'bg-background-input h-4',
    image: 'bg-background-input aspect-video',
    avatar: 'bg-background-input rounded-full aspect-square'
  };

  const baseStyles = clsx(
    'animate-pulse rounded',
    variantStyles[variant],
    className
  );

  return <div className={baseStyles} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-background-card rounded-xl border border-background-input p-4">
      <Skeleton variant="image" className="w-full h-48 mb-4" />
      <Skeleton variant="text" className="w-3/4 mb-2" />
      <Skeleton variant="text" className="w-1/2" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}

export default Skeleton;
