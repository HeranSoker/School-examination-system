import React, { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  options = [],
  error,
  className = '',
  id,
  placeholder = 'Select option...',
  ...props
}, ref) => {
  const selectId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full bg-slate-900/80 border ${error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/20'} rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 focus:outline-none focus:ring-2 ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
