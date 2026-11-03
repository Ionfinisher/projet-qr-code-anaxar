import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Field } from '@/Components/ui/Field';
import { PasswordInput } from '@/Components/ui/PasswordInput';
import { Button } from '@/Components/ui/Button';
import { Alert } from '@/Components/ui/Feedback';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'));
    };

    return (
        <GuestLayout>
            <Head title="Confirmation du mot de passe" />

            <div className="flex flex-col gap-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Sécurité</p>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Confirmez votre mot de passe</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Cette section est sécurisée. Veuillez confirmer votre mot de passe actuel avant de poursuivre.
                    </p>
                </div>

                {errors.password && (
                    <Alert tone="bad" role="alert">
                        {errors.password}
                    </Alert>
                )}

                <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                    <Field id="confirm-password" label="Mot de passe" error={errors.password}>
                        <PasswordInput
                            id="confirm-password"
                            value={data.password}
                            onChange={(val) => setData('password', val)}
                            autoComplete="current-password"
                        />
                    </Field>

                    <Button type="submit" size="lg" block icon="lock-keyhole" loading={processing}>
                        {processing ? 'Vérification…' : 'Confirmer'}
                    </Button>
                </form>
            </div>
        </GuestLayout>
    );
}
