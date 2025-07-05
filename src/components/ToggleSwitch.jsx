import React from 'react';

const ToggleSwitch = ({ 
  isOn, 
  onToggle, 
  leftLabel, 
  rightLabel, 
  disabled = false,
  disabledTooltip = ''
}) => {
  return (
    <div className="flex items-center space-x-3">
      <span className={`text-sm font-medium ${isOn ? 'text-gray-400' : 'text-white'}`}>
        {leftLabel}
      </span>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          isOn ? 'bg-purple-600' : 'bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={disabled ? disabledTooltip : ''}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isOn ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-sm font-medium ${isOn ? 'text-white' : 'text-gray-400'}`}>
        {rightLabel}
      </span>
    </div>
  );
};

export default ToggleSwitch; 