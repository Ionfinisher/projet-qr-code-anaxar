import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Vérification de l'adresse e-mail" />

            <div className="flex flex-col gap-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Inscription</p>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Vérifiez votre e-mail</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Merci de votre inscription ! Un lien de vérification vous a été envoyé par e-mail. Cliquez sur ce lien pour activer votre accès.
                    </p>
                </div>

                {status === 'verification-link-sent' && (
                    <Alert tone="ok" icon="mail-check" role="status">
                        Un nouveau lien de vérification vient d'être envoyé à l'adresse e-mail renseignée lors de votre inscription.
                    </Alert>
                )}

                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Button type="submit" size="lg" block icon="mail" loading={processing}>
                        {processing ? 'Envoi…' : 'Renvoyer l’e-mail de vérification'}
                    </Button>
                </form>

                <div className="border-t border-slate-100 pt-4 text-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={buttonClass({ variant: 'ghost', size: 'sm' })}
                    >
                        <Icon name="log-out" size={16} /> Se déconnecter
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
