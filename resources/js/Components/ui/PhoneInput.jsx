import { COUNTRIES, COUNTRY } from '../../Lib/domain.js';
import { fieldProps, controlClass } from './Field.jsx';
import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

export const PHONE_PLACEHOLDER = { 8: '90 12 34 56', 9: '24 123 4567', 10: '01 23 45 67 89' };

/** Téléphone : indicatif pays (ISO 3166-1) + numéro national. La conversion E.164 se fait avec toE164(cc, value). */
export function PhoneInput({ id, cc, value, onCc, onChange, error, hint, autoComplete = 'tel-national', className }) {
  const digits = COUNTRY[cc]?.digits || 8;
  return (
    <div className={cn('grid grid-cols-[124px_minmax(0,1fr)] gap-2', className)}>
      <div className="relative">
        <select aria-label="Indicatif pays" value={cc} onChange={e => onCc(e.target.value)}
          className={controlClass(false, 'h-11 cursor-pointer appearance-none pl-3 pr-8 tabular-nums')}>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} +{c.dial}</option>)}
        </select>
        <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
      <input type="tel" inputMode="tel" autoComplete={autoComplete} placeholder={PHONE_PLACEHOLDER[digits]} {...fieldProps(id, error, hint)}
        value={value} onChange={e => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 16))}
        className={controlClass(!!error, 'h-11 px-3.5 tabular-nums')} />
    </div>
  );
}
