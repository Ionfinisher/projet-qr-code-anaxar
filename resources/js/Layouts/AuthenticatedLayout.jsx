import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Logo } from '@/Components/domain/Logo';
import { Icon } from '@/Components/ui/Icon';
import { IconButton } from '@/Components/ui/Button';
import { AccountMenu } from '@/Components/ui/Navigation';
import { Drawer } from '@/Components/ui/Overlay';
import { Avatar } from '@/Components/ui/Data';
import FlashAlerts from '@/Components/FlashAlerts';
import { cn } from '@/Lib/cn';

export default function AuthenticatedLayout({ user: propUser, header, children }) {
    const page = usePage();
    const user = propUser || page.props.auth?.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    const routeExists = (name) => typeof route === 'function' && typeof route().has === 'function' && route().has(name);
    const isCurrent = (pattern) => typeof route === 'function' && typeof route().current === 'function' && route().current(pattern);

    const userName = user?.name || `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Utilisateur';
    const userRole = user?.is_admin
        ? 'Administration'
        : user?.user_type === 'societe'
        ? (user?.raisonsociale || 'Société')
        : 'Transporteur';

    const approved = !user?.statut || ['approved', 'active'].includes(user.statut);
    const isTransporteur = !user?.is_admin
        && approved
        && ['societe', 'transitaire', 'particulier'].includes(user?.user_type);

    const navigation = [
        {
            key: 'dashboard',
            label: 'Tableau de bord',
            href: route('dashboard'),
            active: isCurrent('dashboard'),
            icon: 'layout-dashboard',
            visible: true,
        },
        {
            key: 'transporteur-creneaux',
            label: 'Créneaux',
            href: routeExists('transporteur.creneaux.index') ? route('transporteur.creneaux.index') : '#',
            active: isCurrent('transporteur.creneaux.*'),
            icon: 'calendar-days',
            visible: isTransporteur && routeExists('transporteur.creneaux.index'),
        },
        {
            key: 'transporteur-demandes',
            label: 'Mes demandes',
            href: routeExists('transporteur.demandes.index') ? route('transporteur.demandes.index') : '#',
            active: isCurrent('transporteur.demandes.index') || isCurrent('transporteur.demandes.sent') || isCurrent('transporteur.demandes.edit'),
            icon: 'file-text',
            visible: isTransporteur && routeExists('transporteur.demandes.index'),
        },
        {
            key: 'transporteur-new',
            label: 'Nouvelle demande',
            href: routeExists('transporteur.demandes.create') ? route('transporteur.demandes.create') : '#',
            active: isCurrent('transporteur.demandes.create'),
            icon: 'calendar-plus',
            visible: isTransporteur && routeExists('transporteur.demandes.create'),
        },
        {
            key: 'registrations',
            label: 'Inscriptions',
            href: routeExists('admin.registrations.index') ? route('admin.registrations.index') : '#',
            active: isCurrent('admin.registrations.*'),
            icon: 'user-check',
            visible: !!user?.is_admin && routeExists('admin.registrations.index'),
        },
        {
            key: 'creneaux',
            label: 'Créneaux',
            href: routeExists('admin.creneaux.index') ? route('admin.creneaux.index') : '#',
            active: isCurrent('admin.creneaux.*'),
            icon: 'calendar-days',
            visible: !!user?.is_admin && routeExists('admin.creneaux.index'),
        },
        {
            key: 'users',
            label: 'Utilisateurs',
            href: routeExists('users.index') ? route('users.index') : '#',
            active: isCurrent('users.*'),
            icon: 'users',
            visible: (!!user?.is_admin || user?.user_type === 'societe') && routeExists('users.index'),
        },
        {
            key: 'profiles',
            label: 'Profils',
            href: routeExists('profiles.index') ? route('profiles.index') : '#',
            active: isCurrent('profiles.*'),
            icon: 'shield',
            visible: (!!user?.is_admin || user?.user_type === 'societe') && routeExists('profiles.index'),
        },
        {
            key: 'permissions',
            label: 'Permissions',
            href: routeExists('admin.permissions.index') ? route('admin.permissions.index') : '#',
            active: isCurrent('admin.permissions.*'),
            icon: 'lock',
            visible: !!user?.is_admin && routeExists('admin.permissions.index'),
        },
    ].filter(item => item.visible);

    const logout = () => {
        router.post(route('logout'));
    };

    const navContent = (isDark = true, onItemClick) => (
        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
            {navigation.map((m) => (
                <Link
                    key={m.key}
                    href={m.href}
                    onClick={onItemClick}
                    aria-current={m.active ? 'page' : undefined}
                    className={cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        isDark
                            ? m.active
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            : m.active
                            ? 'bg-brand-50 text-brand-800'
                            : 'text-slate-700 hover:bg-slate-100'
                    )}
                >
                    {isDark && (
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
                                m.active ? 'bg-brand-500' : 'bg-transparent'
                            )}
                        />
                    )}
                    <Icon name={m.icon} size={19} />
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                </Link>
            ))}
        </nav>
    );

    return (
        <div lang="fr" className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
            {/* Desktop Sidebar */}
            <aside className="hidden bg-slate-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col" aria-label="Administration">
                <div className="px-5 pb-6 pt-5">
                    <Link href={route('dashboard')}>
                        <Logo dark sub={user?.is_admin ? 'Administration du port' : 'Plateforme PortFlow'} />
                    </Link>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3">
                    {navContent(true)}
                </div>
                <div className="flex flex-col gap-1 border-t border-white/10 px-3 py-4">
                    <div className="mb-2 flex items-center gap-3 px-3">
                        <Avatar name={userName} size={36} tone="dark" className="ring-1 ring-white/20" />
                        <span className="min-w-0">
                            <b className="block truncate text-sm font-semibold text-white">{userName}</b>
                            <small className="block truncate text-xs text-slate-400">{userRole}</small>
                        </span>
                    </div>
                    {routeExists('profile.edit') && (
                        <Link
                            href={route('profile.edit')}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            <Icon name="user" size={18} /> Mon compte
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={logout}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                        <Icon name="log-out" size={18} /> Se déconnecter
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex min-h-screen min-w-0 flex-col">
                {/* TopBar */}
                <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-[6px]">
                    <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
                        <IconButton
                            icon="menu"
                            label="Ouvrir le menu"
                            className="-ml-2 lg:hidden"
                            onClick={() => setMobileOpen(true)}
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            {header ? (
                                <div className="truncate text-base font-semibold text-slate-900">{header}</div>
                            ) : (
                                <span className="truncate text-base font-semibold text-slate-900">
                                    {navigation.find(m => m.active)?.label || 'PortFlow'}
                                </span>
                            )}
                        </div>
                        <AccountMenu
                            name={userName}
                            sub={userRole}
                            items={[
                                routeExists('profile.edit') && {
                                    icon: 'user',
                                    label: 'Mon compte',
                                    onClick: () => router.visit(route('profile.edit')),
                                },
                                {
                                    icon: 'log-out',
                                    label: 'Se déconnecter',
                                    onClick: logout,
                                    tone: 'danger',
                                },
                            ]}
                        />
                    </div>
                </header>

                {/* Content */}
                <main id="pf-main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8">
                    {children}
                </main>
            </div>

            {/* Mobile Drawer */}
            <Drawer
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                title="PortFlow"
                description={userRole}
                size="sm"
            >
                {navContent(false, () => setMobileOpen(false))}
            </Drawer>

            <FlashAlerts />
        </div>
    );
}
