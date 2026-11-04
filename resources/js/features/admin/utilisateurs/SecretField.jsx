import { useRef } from 'react';
import { copyText } from '../../../lib/download.js';
import { Field, Input, Button, fieldProps } from '../../../Components/ui/index.js';

/** Mot de passe provisoire en lecture seule, avec bouton Copier (ou une autre action). */
export function SecretField({ id, label, hint, value, action }) {
  const ref = useRef(null);
  return (
    <Field id={id} label={label} hint={hint}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input ref={ref} mono readOnly value={value} {...fieldProps(id, null, hint ? 'x' : null)} onFocus={ev => ev.target.select()} className="sm:flex-1" />
        {action || <Button variant="secondary" icon="copy" onClick={() => copyText(value, ref.current)}>Copier</Button>}
      </div>
    </Field>
  );
}
