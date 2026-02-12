import { useNavigate } from 'react-router-dom';

/**
 * Error Fallback UI component
 * Displays when an error boundary catches an error
 */
export function ErrorFallback({ error, errorInfo, onReset, showDetails = true }) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
        {/* Error Icon */}
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-400 mb-6">
          An unexpected error occurred. Don't worry, your progress is saved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>

        {/* Error Details (Development) */}
        {showDetails && import.meta.env.DEV && error && (
          <details className="text-left mt-4">
            <summary className="cursor-pointer text-slate-400 hover:text-slate-300 text-sm">
              View Error Details
            </summary>
            <div className="mt-2 p-3 bg-slate-900 rounded text-xs overflow-auto max-h-40">
              <p className="text-red-400 font-mono mb-2">
                {error.toString()}
              </p>
              {errorInfo?.componentStack && (
                <pre className="text-slate-500 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default ErrorFallback;
