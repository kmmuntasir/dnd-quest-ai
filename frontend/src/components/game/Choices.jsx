import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import PropTypes from 'prop-types';

export function ChoiceButton({ choice, index, selected, onSelect, disabled = false, variant = 'default' }) {
  const isSelected = selected === index;
  
  const handleKeyDown = (e) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(index);
    }
  };

  const variantStyles = {
    default: 'bg-background-dark/50 hover:bg-background-input',
    selected: 'bg-primary-default text-white',
    hover: 'hover:border-primary-default/50'
  };

  return (
    <button
      onClick={() => onSelect(index)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      role="option"
      aria-selected={isSelected}
      aria-label={`Choice ${index + 1}: ${choice}`}
      tabIndex={disabled ? -1 : 0}
      className={`group w-full text-left px-6 py-4 rounded-xl border border-background-input transition-all ${
        isSelected ? variantStyles.selected : variantStyles.default
      } ${variantStyles.hover} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-x-1'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Choice Number */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-colors ${
          isSelected ? 'bg-white text-primary-default' : 'bg-background-input text-gray-400'
        }`}>
          {isSelected ? <Check className="w-5 h-5" /> : index + 1}
        </div>

        {/* Choice Text */}
        <div className="flex-1">
          <p className={`text-base leading-relaxed ${
            isSelected ? 'text-white font-medium' : 'text-gray-200'
          }`}>
            {choice}
          </p>
        </div>

        {/* Arrow Icon */}
        <div className={`flex-shrink-0 transition-transform ${
          isSelected ? 'translate-x-0' : 'translate-x-2'
        }`}>
          <ChevronRight className={`w-5 h-5 ${
            isSelected ? 'text-white' : 'text-gray-500'
          }`} />
        </div>
      </div>
    </button>
  );
}

export function ChoicesList({ choices, onSelectChoice, disabled = false, selectedIndex = null }) {
  // Safety check for undefined/null choices
  if (!choices || !Array.isArray(choices) || choices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No choices available</p>
      </div>
    );
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' && selectedIndex !== null && selectedIndex > 0) {
      e.preventDefault();
      onSelectChoice(selectedIndex - 1);
    } else if (e.key === 'ArrowDown' && choices && selectedIndex !== null && selectedIndex < choices.length - 1) {
      e.preventDefault();
      onSelectChoice(selectedIndex + 1);
    }
  };

  return (
    <div
      role="listbox"
      aria-label="Game choices"
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className="space-y-3"
    >
      {choices.map((choice, index) => (
        <ChoiceButton
          key={index}
          choice={choice}
          index={index}
          selected={selectedIndex}
          onSelect={onSelectChoice}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export default { ChoiceButton, ChoicesList };

// PropTypes for ChoiceButton
ChoiceButton.propTypes = {
  choice: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  selected: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'selected', 'hover'])
};

ChoiceButton.defaultProps = {
  disabled: false,
  variant: 'default',
  selected: null
};

// PropTypes for ChoicesList
ChoicesList.propTypes = {
  choices: PropTypes.arrayOf(PropTypes.string),
  onSelectChoice: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  selectedIndex: PropTypes.number
};

ChoicesList.defaultProps = {
  choices: [],
  disabled: false,
  selectedIndex: null
};
