import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700',
  secondary: 'border border-ink-900/15 bg-white text-ink-900 hover:border-violet-300 hover:bg-violet-50',
  gold: 'bg-gold-300 text-ink-950 shadow-lg shadow-gold-400/20 hover:bg-gold-400',
  ghost: 'text-ink-800 hover:bg-ink-900/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-13 gap-2 rounded-xl px-5 text-sm',
};

export const Button = forwardRef(function Button(
  { as: Component = 'button', to, variant = 'primary', size = 'md', className = '', children, ...props },
  ref,
) {
  const classes = `inline-flex items-center justify-center whitespace-nowrap font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
  if (to) return <Link ref={ref} to={to} className={classes} {...props}>{children}</Link>;
  return <Component ref={ref} className={classes} {...props}>{children}</Component>;
});
