import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, Button, Badge, Icon } from '@/Components/ui';
import { PERM_LABEL } from '@/Lib/domain';
import { cn } from '@/Lib/cn';
import { ProfileDrawer } from './ProfileDrawer';

export default function Index({ auth, profiles = [] }) {
    const [openId, setOpenId] = useState(null);
    const [creating, setCreating] = useState(false);

    const sel = openId ? profiles.find((p) => p.id === openId) : null;

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Profils & Habilitations" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Profils"
                    subtitle="Un profil regroupe les habilitations attribuées aux utilisateurs de l’administration et du port."
                    actions={(
                        <Button icon="shield-plus" onClick={() => setCreating(true)}>
                            Nouveau profil
                        </Button>
                    )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {profiles.map((p) => {
                        const allPerms = p.perms.includes('*');
                        const permsLabels = allPerms
                            ? ['Toutes les habilitations']
                            : p.perms.map((x) => PERM_LABEL[x] || x);
                        const userCount = p.users_count ?? 0;

                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setOpenId(p.id)}
                                className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:border-brand-400 hover:bg-brand-50/20 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span
                                        className={cn(
                                            'flex h-10 w-10 items-center justify-center rounded-xl',
                                            p.kind === 'externe'
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-sky-50 text-sky-700'
                                        )}
                                    >
                                        <Icon
                                            name={allPerms ? 'key-round' : p.kind === 'externe' ? 'truck' : 'shield-user'}
                                            size={20}
                                        />
                                    </span>
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        <Badge tone={p.kind === 'externe' ? 'neutral' : 'info'}>
                                            {p.kind === 'externe' ? 'Externe' : 'Interne'}
                                        </Badge>
                                        {Boolean(p.is_system ?? p.system) ? <Badge icon="lock">Système</Badge> : null}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="block text-base font-semibold text-slate-900">{p.name}</h3>
                                    {p.description ? (
                                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                                            {p.description}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-1 text-[13px] text-slate-700">
                                    {permsLabels.slice(0, 3).map((lbl) => (
                                        <span key={lbl} className="flex items-start gap-1.5">
                                            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                                            <span className="truncate">{lbl}</span>
                                        </span>
                                    ))}
                                    {permsLabels.length > 3 ? (
                                        <span className="text-xs text-slate-400">
                                            + {permsLabels.length - 3} autre{permsLabels.length - 3 > 1 ? 's' : ''}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[13px] text-slate-500">
                                    <Icon name="users" size={15} />
                                    <span>
                                        {userCount} utilisateur{userCount > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {sel ? (
                    <ProfileDrawer
                        key={sel.id}
                        p={sel}
                        onClose={() => setOpenId(null)}
                    />
                ) : null}

                {creating ? (
                    <ProfileDrawer
                        p={null}
                        onClose={() => setCreating(false)}
                    />
                ) : null}
            </div>
        </AuthenticatedLayout>
    );
}

