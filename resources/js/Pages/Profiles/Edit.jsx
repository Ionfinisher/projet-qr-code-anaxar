import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Field, Input } from '@/Components/ui/Field';
import { Checkbox } from '@/Components/ui/Choice';
import { Button } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';

export default function Edit({ auth, profile, permissions = [] }) {
    const initial = (profile.permissions || []).map((p) => p.id);
    const { data, setData, put, processing, errors } = useForm({
        name: profile.name || '',
        permissions: initial,
    });

    const togglePermission = (id) => {
        setData(
            'permissions',
            data.permissions.includes(id)
                ? data.permissions.filter((v) => v !== id)
                : [...data.permissions, id]
        );
    };

    const toggleAll = () => {
        if (data.permissions.length === permissions.length) {
            setData('permissions', []);
        } else {
            setData('permissions', permissions.map((p) => p.id));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        put(route('profiles.update', profile.id));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Modifier le profil ${profile.name}`} />

            <div className="mx-auto max-w-3xl flex flex-col gap-6">
                <PageHeader
                    title="Modifier le profil d’habilitation"
                    subtitle={`Profil : ${profile.name}`}
                    className="mb-0"
                    actions={
                        <Link
                            href={route('profiles.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <Icon name="arrow-left" size={14} /> Annuler
                        </Link>
                    }
                />

                <Card as="form" onSubmit={submit} className="flex flex-col gap-6">
                    <Field
                        id="profile-name"
                        label="Nom du profil"
                        required
                        error={errors.name}
                    >
                        <Input
                            id="profile-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </Field>

                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                                    Permissions accordées ({data.permissions.length}/{permissions.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Cochez les droits que détiendront les utilisateurs dotés de ce profil.
                                </p>
                            </div>

                            {permissions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={toggleAll}
                                    className="text-xs font-semibold text-brand-700 hover:underline"
                                >
                                    {data.permissions.length === permissions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                </button>
                            )}
                        </div>

                        {permissions.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Aucune permission enregistrée dans le système.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {permissions.map((p) => {
                                    const isChecked = data.permissions.includes(p.id);

                                    return (
                                        <label
                                            key={p.id}
                                            className={cn(
                                                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                                                isChecked
                                                    ? 'border-brand-300 bg-brand-50/40 text-brand-900'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            )}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onChange={() => togglePermission(p.id)}
                                                className="mt-0.5"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-mono text-xs font-semibold truncate">
                                                    {p.name}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {errors.permissions && (
                            <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
                                {errors.permissions}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                        <Link
                            href={route('profiles.index')}
                            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Annuler
                        </Link>

                        <Button
                            type="submit"
                            icon="check"
                            loading={processing}
                            disabled={processing || !data.name.trim()}
                        >
                            {processing ? 'Enregistrement…' : 'Enregistrer les modifications'}
                        </Button>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
