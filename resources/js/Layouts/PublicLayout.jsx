import { Link } from '@inertiajs/react';
import { Logo } from '@/Components/domain/Logo';
import { buttonClass } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';
import FlashAlerts from '@/Components/FlashAlerts';
import { cn } from '@/Lib/cn';

export default function PublicLayout({ children, wide = true }) {
    const routeExists = (name) => typeof route === 'function' && typeof route().has === 'function' && route().has(name);

    return (
        <div lang="fr" className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-[6px]">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
                    <Link
                        href={routeExists('login') ? route('login') : '/'}
                        aria-label="Accueil PortFlow"
                        className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                        <Logo sub="Plateforme transporteurs" />
                    </Link>
                    <span className="flex-1" />
                    {routeExists('registration.status') && (
                        <Link
                            href={route('registration.status')}
                            className={buttonClass({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}
                        >
                            <Icon name="file-search" size={16} /> Suivre ma demande
                        </Link>
                    )}
                    {routeExists('login') && (
                        <Link
                            href={route('login')}
                            className={buttonClass({ variant: 'secondary', size: 'sm' })}
                        >
                            <Icon name="log-in" size={16} /> Se connecter
                        </Link>
                    )}
                </div>
            </header>

            <main
                id="pf-main"
                tabIndex={-1}
                className={cn(
                    'mx-auto w-full flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8',
                    wide ? 'max-w-7xl' : 'max-w-4xl'
                )}
            >
                {children}
            </main>

            <FlashAlerts />
        </div>
    );
}
export { PublicLayout };
