import { forwardRef } from 'react';
import { Icon } from './Icon.jsx';
import { Spinner } from './Spinner.jsx';
import { cn } from '../../Lib/cn.js';

const BASE = 'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const BUTTON_VARIANTS = {
  primary: 'bg-brand-900 text-yellow-300 hover:bg-brand-950 shadow-[0_1px_2px_rgba(15,23,42,0.15)] focus-visible:ring-brand-500',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-400',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500',
  ok: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_1px_2px_rgba(15,23,42,0.15)] focus-visible:ring-emerald-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  'danger-outline': 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 hover:border-rose-400 focus-visible:ring-rose-400',
  link: 'bg-transparent text-brand-700 hover:text-brand-800 hover:underline underline-offset-4 focus-visible:ring-brand-500 rounded-md',
};
export const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  xl: 'min-h-16 px-6 py-3 text-lg gap-3 rounded-2xl',
};
const ICON = { sm: 16, md: 18, lg: 20, xl: 24 };

/** Classes d'un bouton : pour styler un lien (<a>, <AppLink>) comme un bouton. */
export const buttonClass = ({ variant = 'primary', size = 'md', block, className } = {}) =>
  cn(BASE, BUTTON_VARIANTS[variant], variant === 'link' ? 'text-sm' : BUTTON_SIZES[size], block && 'w-full', className);

/**
 * Bouton. variant : primary | secondary | ghost | dark | ok | danger | danger-outline | link
 * size : sm | md | lg | xl (xl : écrans tactiles de la guérite). `href` → rendu en lien.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, loading = false, className, children, href, type, disabled, ...rest }, ref,
) {
  const cls = buttonClass({ variant, size, block, className });
  const content = (
    <>
      {loading ? <Spinner size={ICON[size]} /> : icon ? <Icon name={icon} size={ICON[size]} /> : null}
      {children != null && children !== false && <span className="min-w-0 truncate">{children}</span>}
      {iconRight && <Icon name={iconRight} size={ICON[size]} />}
    </>
  );
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  return (
    <button ref={ref} type={type || 'button'} className={cls} {...rest} disabled={disabled || loading} aria-busy={loading || undefined}>
      {content}
    </button>
  );
});

const ICON_VARIANTS = {
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  dark: 'text-slate-300 hover:bg-white/10 hover:text-white',
  danger: 'text-rose-600 hover:bg-rose-50',
};

/** Bouton icône seul : `label` est obligatoire (nom accessible et infobulle). */
export const IconButton = forwardRef(function IconButton({ icon, label, size = 'md', variant = 'ghost', badge, className, ...rest }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label}
      className={cn('relative inline-flex items-center justify-center rounded-xl cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10', ICON_VARIANTS[variant], className)} {...rest}>
      <Icon name={icon} size={size === 'lg' ? 22 : size === 'sm' ? 18 : 20} />
      {badge ? (
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">{badge}</span>
      ) : null}
    </button>
  );
});
