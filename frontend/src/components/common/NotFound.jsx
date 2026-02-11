import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-darker">
      <div className="text-center px-4">
        <Compass className="w-24 h-24 mx-auto text-accent-gold mb-6" />
        <h1 className="font-display text-4xl font-bold text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          The adventure you're looking for doesn't exist or has been lost in the mists of time.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-default hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
