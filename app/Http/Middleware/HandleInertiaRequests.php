<?php

namespace App\Http\Middleware;

use App\Models\PieceAFournir;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ?
                    [
                        ...$request->user()->toArray(),
                        'is_admin' => $request->user()->isAdmin(),
                    ] : null,

            ],
            'flash' => function () use ($request) {
                $success = $request->session()->get('success');
                $error = $request->session()->get('error');
                $hasMessage = ($success !== null && $success !== '')
                    || ($error !== null && $error !== '');

                return [
                    'success' => $success,
                    'error' => $error,
                    'key' => $hasMessage ? (string) Str::uuid() : null,
                ];
            },
            'doc_types' => fn () => PieceAFournir::query()
                ->active()
                ->rdv()
                ->orderBy('post')
                ->get()
                ->map(fn (PieceAFournir $p) => [
                    'id' => $p->id,
                    'key' => $p->code ?: $p->short,
                    'code' => $p->code ?: $p->short,
                    'label' => $p->libelle,
                    'short' => $p->short ?: $p->libelle,
                    'icon' => $p->icon ?: 'file-text',
                    'hint' => $p->hint ?: $p->description,
                    'post' => $p->post,
                    'isrequired' => (bool) $p->isrequired,
                    'extension' => $p->extension,
                ])
                ->values()
                ->all(),
        ];
    }
}
