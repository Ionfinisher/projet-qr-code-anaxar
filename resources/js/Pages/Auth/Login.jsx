import { useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Field, Input } from '@/Components/ui/Field';
import { PasswordInput } from '@/Components/ui/PasswordInput';
import { Checkbox } from '@/Components/ui/Choice';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

export default function Login({ canResetPassword, status }) {
    const idRef = useRef(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        idRef.current?.focus({ preventScroll: true });
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <GuestLayout>
            <Head title="Se connecter" />

            <div className="flex flex-col gap-7">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Se connecter</h1>
                    <p className="mt-1 text-[15px] text-slate-500">
                        Transporteurs, transitaires et administration du port.
                    </p>
                </div>

                {status && (
                    <Alert tone="ok" role="status">
                        {status}
                    </Alert>
                )}

                {hasErrors && (
                    <Alert tone="bad" role="alert">
                        {errors.email || errors.password || 'Identifiant ou mot de passe incorrect.'}
                    </Alert>
                )}

                <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
                    <Field id="login-email" label="E-mail" error={errors.email}>
                        <Input
                            ref={idRef}
                            id="login-email"
                            type="email"
                            autoComplete="username"
                            inputMode="email"
                            placeholder="exploitation@societe.tg"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </Field>

                    <Field
                        id="login-password"
                        label="Mot de passe"
                        error={errors.password}
                        labelAside={
                            canResetPassword && typeof route === 'function' && route().has('password.request') ? (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-brand-700 hover:underline"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            ) : null
                        }
                    >
                        <PasswordInput
                            id="login-password"
                            value={data.password}
                            onChange={(val) => setData('password', val)}
                            autoComplete="current-password"
                        />
                    </Field>

                    <div className="flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                            />
                            <span>Se souvenir de moi</span>
                        </label>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        block
                        icon="log-in"
                        loading={processing}
                        disabled={processing}
                    >
                        {processing ? 'Vérification…' : 'Se connecter'}
                    </Button>
                </form>

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-6">
                    {typeof route === 'function' && route().has('register') && (
                        <Link
                            href={route('register')}
                            className={buttonClass({ variant: 'secondary', block: true })}
                        >
                            <Icon name="user-plus" size={18} /> Créer un compte transporteur
                        </Link>
                    )}

                    {typeof route === 'function' && route().has('registration.status') && (
                        <Link
                            href={route('registration.status')}
                            className={buttonClass({ variant: 'ghost', block: true })}
                        >
                            <Icon name="file-search" size={18} /> Suivre ma demande d’inscription
                        </Link>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
