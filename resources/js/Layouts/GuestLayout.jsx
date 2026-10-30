import FlashAlerts from '@/Components/FlashAlerts';

export default function Guest({ children }) {
    return (
        <div className="min-h-screen bg-gray-950 md:grid md:grid-cols-2">
            <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-bl from-amber-300 via-indigo-950 to-indigo-900 px-8 py-12 text-gray-200 md:flex md:items-center lg:px-16">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

                <div className="relative mx-auto w-full max-w-xl">
                    <div className="mb-16">
                        <span className="text-2xl font-black tracking-tight text-white">PortFlow</span>
                        <span className="ms-3 border-s border-indigo-400/50 ps-3 text-sm text-indigo-200">Port de Lomé</span>
                    </div>

                    <h1 className="max-w-lg text-4xl font-extrabold leading-tight text-white lg:text-5xl">
                        Rendez-vous camions, simplement et en toute sécurité.
                    </h1>
                    <p className="mt-6 max-w-lg text-lg leading-8 text-indigo-100/80">
                        Réservez en ligne, faites valider vos créneaux par le port et contrôlez vos accès grâce au QR code.
                    </p>

                    <ol className="mt-12 space-y-6 text-sm text-indigo-100/80">
                        <li className="flex gap-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-indigo-950">1</span>
                            <span><b className="block text-white">Inscription du transporteur</b>Pièces vérifiées par l'administration avant l'ouverture du compte.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-indigo-950">2</span>
                            <span><b className="block text-white">Demande de rendez-vous</b>Créneau de 2 h choisi selon les places disponibles.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-indigo-950">3</span>
                            <span><b className="block text-white">QR code signé</b>Émis après validation, envoyé au chauffeur par WhatsApp.</span>
                        </li>
                    </ol>
                </div>
            </aside>

            <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 sm:px-12">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </main>

            <FlashAlerts />
        </div>
    );
}
