import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';

export function ChoiceButton({ choice, index, selected, onSelect, disabled = false, variant = 'default' }) {
  const isSelected = selected === index;
  
  const variantStyles = {
    default: 'bg-background-dark/50 hover:bg-background-input',
    selected: 'bg-primary-default text-white',
    hover: 'hover:border-primary-default/50'
  };

  return (
    <button
      onClick={() => onSelect(index)}
      disabled={disabled}
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
  return (
    <div className="space-y-3">
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
