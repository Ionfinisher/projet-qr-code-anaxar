import { useState } from 'react';
import { passwordChecks } from '../../Lib/domain.js';
import { fieldProps, controlClass } from './Field.jsx';
import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** Mot de passe avec bouton Afficher / Masquer. */
export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', error, hint, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} autoComplete={autoComplete} spellCheck={false} placeholder={placeholder} autoFocus={autoFocus}
        {...fieldProps(id, error, hint)} value={value} onChange={e => onChange(e.target.value)} className={controlClass(!!error, 'h-11 pl-3.5 pr-12')} />
      <button type="button" onClick={() => setShow(x => !x)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show}
        className="absolute inset-y-1 right-1 flex w-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <Icon name={show ? 'eye-off' : 'eye'} size={18} />
      </button>
    </div>
  );
}

/** Règles du mot de passe, cochées au fil de la saisie. */
export function PasswordRules({ value, className }) {
  return (
    <ul aria-label="Règles du mot de passe" className={cn('grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2', className)}>
      {passwordChecks(value).map(c => (
        <li key={c.label} className={cn('flex items-center gap-2', c.ok ? 'text-emerald-700' : 'text-slate-500')}>
          <Icon name={c.ok ? 'circle-check' : 'circle'} size={15} /> {c.label}
        </li>
      ))}
    </ul>
  );
}
