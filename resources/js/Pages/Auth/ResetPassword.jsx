import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Field, Input } from '@/Components/ui/Field';
import { PasswordInput, PasswordRules } from '@/Components/ui/PasswordInput';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'));
    };

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <GuestLayout>
            <Head title="Nouveau mot de passe" />

            <div className="flex flex-col gap-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Sécurité du compte</p>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Nouveau mot de passe</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Choisissez le nouveau mot de passe pour votre compte PortFlow.
                    </p>
                </div>

                {hasErrors && (
                    <Alert tone="bad" role="alert">
                        {errors.email || errors.password || errors.password_confirmation || 'Une erreur est survenue.'}
                    </Alert>
                )}

                <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
                    <Field id="reset-email" label="Adresse e-mail" error={errors.email}>
                        <Input
                            id="reset-email"
                            type="email"
                            name="email"
                            value={data.email}
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </Field>

                    <Field id="reset-password" label="Nouveau mot de passe" error={errors.password}>
                        <PasswordInput
                            id="reset-password"
                            value={data.password}
                            onChange={(val) => setData('password', val)}
                            autoComplete="new-password"
                        />
                    </Field>

                    <Field
                        id="reset-password-confirm"
                        label="Confirmer le mot de passe"
                        error={errors.password_confirmation}
                    >
                        <PasswordInput
                            id="reset-password-confirm"
                            value={data.password_confirmation}
                            onChange={(val) => setData('password_confirmation', val)}
                            autoComplete="new-password"
                        />
                    </Field>

                    <PasswordRules value={data.password} />

                    <Button
                        type="submit"
                        size="lg"
                        block
                        icon="lock-keyhole"
                        loading={processing}
                    >
                        {processing ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
                    </Button>
                </form>

                <Link
                    href={route('login')}
                    className={buttonClass({ variant: 'ghost', block: true })}
                >
                    <Icon name="arrow-left" size={18} /> Retour à la connexion
                </Link>
            </div>
        </GuestLayout>
    );
}
