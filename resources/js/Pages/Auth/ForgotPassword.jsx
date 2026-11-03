import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Card } from '@/Components/ui/Card';
import { Field, Input } from '@/Components/ui/Field';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Mot de passe oublié" />

            <div className="flex flex-col gap-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Espace public</p>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Mot de passe oublié</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Recevez un lien pour choisir un nouveau mot de passe (valable 1 heure) par e-mail.
                    </p>
                </div>

                {status ? (
                    <Alert tone="ok" icon="mail-check" role="status" title="Demande enregistrée">
                        {status}
                    </Alert>
                ) : (
                    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
                        <Field id="forgot-email" label="Adresse e-mail" error={errors.email}>
                            <Input
                                id="forgot-email"
                                type="email"
                                autoComplete="username"
                                placeholder="nom@entreprise.tg"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </Field>

                        <Button type="submit" size="lg" block icon="send" loading={processing}>
                            {processing ? 'Envoi…' : 'Recevoir le lien'}
                        </Button>
                    </form>
                )}

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
