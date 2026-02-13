import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import React from 'react';
import { clsx } from 'clsx';
import { API_BASE_URL } from '../../config/api';

/**
 * Resolve image URL - prepend API base URL for relative URLs
 * @param {string} src - Image source URL (can be relative or absolute)
 * @returns {string|null} Resolved URL or null if no source
 */
export function resolveImageUrl(src) {
  if (!src) return null;
  // If it's already a full URL, return as-is
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  // For relative URLs starting with /api, prepend the base host
  if (src.startsWith('/api/')) {
    return `${API_BASE_URL}${src}`;
  }
  // For other relative URLs, prepend the API base URL with /api
  return `${API_BASE_URL}/api${src.startsWith('/') ? '' : '/'}${src}`;
}

export function Image({ src, alt, className = '', fallback = null, ...props }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolvedSrc = resolveImageUrl(src);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (!resolvedSrc) {
    return (
      <div className={clsx('bg-background-input flex items-center justify-center text-gray-500', className)} {...props}>
        <ImageIcon className="w-16 h-16" />
        <span className="ml-3 text-sm">No image</span>
      </div>
    );
  }

  if (error && fallback) {
    return (
      <div className={clsx('bg-background-input flex items-center justify-center', className)} {...props}>
        {fallback}
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('bg-background-input flex items-center justify-center text-gray-500', className)} {...props}>
        <ImageIcon className="w-16 h-16" />
        <span className="ml-3 text-sm">Image not available</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative overflow-hidden', className)} {...props}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-input">
          <div className="animate-spin w-8 h-8 border-2 border-primary-default border-t-transparent rounded-full" />
        </div>
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={clsx('w-full h-full object-cover', loading ? 'opacity-0' : 'opacity-100', 'transition-opacity')}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}

export function SceneImage({ src, alt, className = '' }) {
  return (
    <div className={clsx('aspect-video bg-background-input rounded-lg overflow-hidden shadow-2xl', className)}>
      <Image src={src} alt={alt} className="w-full h-full" />
    </div>
  );
}

export function NPCPortrait({ src, name, size = 'md' }) {
  const sizeStyles = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={clsx('rounded-full overflow-hidden border-2 border-accent-gold shadow-lg', sizeStyles[size])}>
        <Image src={src} alt={`Portrait of ${name}`} />
      </div>
      <p className="mt-2 text-sm font-medium text-gray-300">{name}</p>
    </div>
  );
}

export default Image;
