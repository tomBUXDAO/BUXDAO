import React from 'react';

const ToggleSwitch = ({ 
  isOn, 
  onToggle, 
  leftLabel, 
  rightLabel, 
  disabled = false,
  disabledTooltip = '',
  setActiveTab,
  activeTab
}) => {
  return (
    <div className="flex items-center space-x-3">
      <span
        className={`text-sm font-medium cursor-pointer ${activeTab === 'cart' ? 'text-white' : 'text-gray-400'}`}
        onClick={() => !disabled && setActiveTab && setActiveTab('cart')}
      >
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
      <span
        className={`text-sm font-medium cursor-pointer ${activeTab === 'orders' ? 'text-white' : 'text-gray-400'}`}
        onClick={() => !disabled && setActiveTab && setActiveTab('orders')}
      >
        {rightLabel}
      </span>
    </div>
  );
};

export default ToggleSwitch; 