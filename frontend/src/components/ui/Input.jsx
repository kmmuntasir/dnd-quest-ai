import { clsx } from 'clsx';
import PropTypes from 'prop-types';

export function Input({
  label,
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  error = '',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  required = false,
  className = '',
  ...props
}) {
  const inputStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-accent-red ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid ? 'true' : 'false'}
        aria-required={required ? 'true' : 'false'}
        className={inputStyles}
        {...props}
      />
      {error && (
        <p className="text-sm text-accent-red" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'url', 'search']),
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  'aria-label': PropTypes.string,
  'aria-describedby': PropTypes.string,
  'aria-invalid': PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string
};

Input.defaultProps = {
  type: 'text',
  placeholder: '',
  value: '',
  error: '',
  disabled: false,
  required: false,
  className: ''
};

export function Textarea({
  label,
  placeholder = '',
  value = '',
  onChange,
  error = '',
  disabled = false,
  rows = 4,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  className = '',
  ...props
}) {
  const textareaStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all resize-y',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-accent-red ml-1">*</span>}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedby}
        aria-required={required ? 'true' : 'false'}
        className={textareaStyles}
        {...props}
      />
      {error && (
        <p className="text-sm text-accent-red" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  );
}

Textarea.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  rows: PropTypes.number,
  required: PropTypes.bool,
  'aria-label': PropTypes.string,
  'aria-describedby': PropTypes.string,
  className: PropTypes.string
};

Textarea.defaultProps = {
  placeholder: '',
  value: '',
  error: '',
  disabled: false,
  rows: 4,
  required: false,
  className: ''
};

export function Select({
  label,
  options = [],
  value = '',
  onChange,
  error = '',
  disabled = false,
  placeholder = 'Select...',
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  className = '',
  ...props
}) {
  const selectStyles = clsx(
    'w-full px-4 py-3 bg-background-input text-white rounded-lg border',
    error ? 'border-accent-red focus:border-accent-red' : 'border-background-input focus:border-primary-default',
    'focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all',
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  );

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-accent-red ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedby}
        aria-required={required ? 'true' : 'false'}
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
        <p className="text-sm text-accent-red" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  'aria-label': PropTypes.string,
  'aria-describedby': PropTypes.string,
  className: PropTypes.string
};

Select.defaultProps = {
  options: [],
  value: '',
  error: '',
  disabled: false,
  placeholder: 'Select...',
  required: false,
  className: ''
};

export default { Input, Textarea, Select };
