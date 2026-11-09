import { useRef, useState } from 'react';
import { Field, Input, Button } from '@/Components/ui';

/** Mot de passe provisoire en lecture seule, avec bouton Copier. */
export function SecretField({ id = 'uf-temp', label = 'Mot de passe provisoire', hint, value, action }) {
    const ref = useRef(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            if (ref.current) {
                ref.current.select();
            }
        }
    };

    return (
        <Field id={id} label={label} hint={hint}>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    ref={ref}
                    id={id}
                    readOnly
                    value={value || ''}
                    onFocus={(ev) => ev.target.select()}
                    className="font-mono text-sm tracking-wide sm:flex-1"
                />
                {action || (
                    <Button
                        type="button"
                        variant="secondary"
                        icon={copied ? 'check' : 'copy'}
                        onClick={handleCopy}
                    >
                        {copied ? 'Copié !' : 'Copier'}
                    </Button>
                )}
            </div>
        </Field>
    );
}

export default SecretField;

