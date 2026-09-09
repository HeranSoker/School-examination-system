import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-slate-900/80 border ${error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/20'} rounded-lg ${Icon ? 'pl-10' : 'px-3.5'} py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 focus:outline-none focus:ring-2 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
