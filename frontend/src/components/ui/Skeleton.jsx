/**
 * Skeleton loading components
 * Display placeholder content while data is loading
 */

export function Skeleton({ className = '', variant = 'text', width, height }) {
  const baseClasses = 'animate-pulse bg-slate-700/50 rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-10 w-10 rounded-full',
    thumbnail: 'h-24 w-24 rounded-lg',
    card: 'h-32 w-full rounded-lg',
    button: 'h-10 w-24 rounded-lg',
    image: 'h-48 w-full rounded-lg'
  };

  const style = {
    width: width || undefined,
    height: height || undefined
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-2/3' : ''}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 ${className}`}>
      <Skeleton variant="image" className="mb-4" />
      <Skeleton variant="title" className="mb-2" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonGameScene({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image skeleton */}
      <Skeleton variant="image" height={384} className="w-full aspect-video" />

      {/* Narrative skeleton */}
      <div className="bg-slate-800/50 rounded-lg p-6">
        <SkeletonText lines={4} />
      </div>

      {/* Choices skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="button" className="w-full h-14" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonAdventureCard({ className = '' }) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton variant="thumbnail" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLibrary({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton variant="title" className="w-48" />
        <Skeleton variant="button" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-4">
        {[1, 2, 3].map(i => (
          <SkeletonAdventureCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
