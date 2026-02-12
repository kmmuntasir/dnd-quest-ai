import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 5000,
  className = ''
}) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle
  };

  const colors = {
    success: 'border-accent-green bg-accent-green/10',
    error: 'border-accent-red bg-accent-red/10',
    info: 'border-primary-default bg-primary-default/10',
    warning: 'border-accent-gold bg-accent-gold/10'
  };

  const Icon = icons[type];

  // Auto-close after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return createPortal(
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div
        className={clsx(
          'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm max-w-md',
          colors[type],
          className
        )}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          type === 'success' ? 'text-accent-green' :
          type === 'error' ? 'text-accent-red' :
          type === 'warning' ? 'text-accent-gold' : 'text-primary-default'
        }`} />
        <div className="flex-1">
          <p className="text-sm text-white">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default Toast;
