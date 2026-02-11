import { clsx } from 'clsx';

export function Input({
  label,
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  error = '',
  disabled = false,
  className = '',
  ...props
}) {
  const inputStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={inputStyles}
        {...props}
      />
      {error && (
        <p className="text-sm text-accent-red">{error}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  placeholder = '',
  value = '',
  onChange,
  error = '',
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) {
  const textareaStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all resize-y',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={textareaStyles}
        {...props}
      />
      {error && (
        <p className="text-sm text-accent-red">{error}</p>
      )}
    </div>
  );
}

export function Select({
  label,
  options = [],
  value = '',
  onChange,
  error = '',
  disabled = false,
  placeholder = 'Select...',
  className = '',
  ...props
}) {
  const selectStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all',
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
    className
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={selectStyles}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-accent-red">{error}</p>
      )}
    </div>
  );
}

export default { Input, Textarea, Select };
