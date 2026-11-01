import { useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import FlashAlerts from '@/Components/FlashAlerts';
import { Link } from '@inertiajs/react';

export default function Authenticated({ user, header, children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showingMobileSidebar, setShowingMobileSidebar] = useState(false);

    const navigation = [
        {
            label: 'Dashboard',
            href: route('dashboard'),
            active: route().current('dashboard'),
            icon: (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 13h8V3H3v10Zm0 8h8v-4H3v4Zm10 0h8V11h-8v10Zm0-14h8V3h-8v4Z" />
                </svg>
            ),
        },
        ...(user?.is_admin
            ? [{
                label: 'Inscriptions',
                href: route('admin.registrations.index'),
                active: route().current('admin.registrations.*'),
                icon: (
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7h8M8 11h8M8 15h5M5 3h10l4 4v14H5V3Z" />
                    </svg>
                ),
            }]
            : []),
        {
            label: 'Profils',
            href: route('profiles.index'),
            active: route().current('profiles.*'),
            icon: (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3v6m3-3h-6" />
                </svg>
            ),
        },
        ...(user?.is_admin
            ? [{
                label: 'Permissions',
                href: route('admin.permissions.index'),
                active: route().current('admin.permissions.*'),
                icon: (
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.5-3a8.6 8.6 0 0 0-.1-1.3l2-1.5-2-3.4-2.4 1a8.4 8.4 0 0 0-2.2-1.3L15.5 3h-4l-.3 2.5a8.4 8.4 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.5a8.6 8.6 0 0 0-.1 1.3c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.4-1c.7.5 1.4 1 2.2 1.3l.3 2.5h4l.3-2.5c.8-.3 1.5-.8 2.2-1.3l2.4 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3Z" />
                    </svg>
                ),
            }]
            : []),
    ];

    const closeMobileSidebar = () => setShowingMobileSidebar(false);

    return (
        <div className="min-h-screen bg-gray-100">
            {showingMobileSidebar && (
                <button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={closeMobileSidebar}
                    className="fixed inset-0 z-30 bg-gray-950/50 lg:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 start-0 z-40 flex w-72 flex-col bg-indigo-950 text-indigo-100 shadow-xl transition-transform duration-200 lg:translate-x-0 ${
                    showingMobileSidebar ? 'translate-x-0' : '-translate-x-full'
                } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
            >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
                    <Link href={route('dashboard')} className="flex min-w-0 items-center gap-3">
                        <ApplicationLogo className="h-9 w-9 shrink-0 fill-current text-amber-300" />
                        <span className={`truncate text-lg font-black text-white ${sidebarCollapsed ? 'lg:hidden' : ''}`}>PortFlow</span>
                    </Link>
                    <button
                        type="button"
                        aria-label="Fermer le menu"
                        onClick={closeMobileSidebar}
                        className="rounded-md p-2 text-indigo-200 hover:bg-white/10 lg:hidden"
                    >
                        <span className="text-xl">×</span>
                    </button>
                </div>

                <nav className="flex-1 space-y-2 px-3 py-6">
                    {navigation.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={closeMobileSidebar}
                            title={sidebarCollapsed ? item.label : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                                item.active
                                    ? 'bg-amber-300 text-indigo-950 shadow-sm'
                                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                            } ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
                        >
                            {item.icon}
                            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={`border-t border-white/10 p-3 ${sidebarCollapsed ? 'lg:flex lg:justify-center' : ''}`}>
                    <button
                        type="button"
                        onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                        className="hidden rounded-lg p-3 text-indigo-200 hover:bg-white/10 hover:text-white lg:block"
                        aria-label={sidebarCollapsed ? 'Développer le menu' : 'Réduire le menu'}
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sidebarCollapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
                        </svg>
                    </button>
                </div>
            </aside>

            <div className={`min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? 'lg:ms-20' : 'lg:ms-72'}`}>
                <nav className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
                    <button
                        type="button"
                        onClick={() => setShowingMobileSidebar(true)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="ms-auto">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                >
                                    {user.name}
                                    <svg className="ms-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </nav>

                {header && (
                    <header className="bg-white shadow">
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                    </header>
                )}

                <main>{children}</main>
            </div>

            <FlashAlerts />
        </div>
    );
}
