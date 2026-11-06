<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Support\DemandeRdvPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RdvController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status', 'all');
        $search = trim((string) $request->query('q', ''));
        $selectedId = $request->query('id');

        $baseQuery = DemandeCamion::query()
            ->whereHas('demande', function ($q) {
                $q->where('status', DemandeRdv::STATUS_APPROVED);
            })
            ->with([
                'demande.creneau',
                'demande.user',
                'demande.documents',
            ]);

        $allCamions = (clone $baseQuery)->get();
        $allRdvs = $allCamions->map(fn (DemandeCamion $c) => DemandeRdvPresenter::rdv($c, $c->demande));

        // Filter by search needle
        if ($search !== '') {
            $needle = mb_strtoupper(preg_replace('/\s+/', '', $search));
            $allRdvs = $allRdvs->filter(function ($r) use ($needle) {
                $haystack = mb_strtoupper(preg_replace('/\s+/', '', implode(' ', [
                    $r['id'],
                    $r['demandeId'],
                    $r['container']['number'],
                    $r['container']['bl'],
                    $r['vehicle']['tractor'],
                    $r['vehicle']['trailer'],
                    $r['driver']['first'],
                    $r['driver']['last'],
                    $r['transporter']['company'],
                ])));

                return str_contains($haystack, $needle);
            })->values();
        }

        $now = time();
        $counts = [
            'all' => $allRdvs->count(),
            'up' => 0,
            'gate' => 0,
            'port' => 0,
            'done' => 0,
        ];

        foreach ($allRdvs as $r) {
            $slotDate = $r['slot']['date'];
            $slotEnd = $r['slot']['end'];
            $endTs = strtotime("{$slotDate} {$slotEnd}:00") ?: $now;

            if ($r['cancelled']) {
                $counts['done']++;
            } elseif ($r['exitAt']) {
                $counts['done']++;
            } elseif ($r['entryAt']) {
                $counts['port']++;
            } elseif ($r['arrivedAt']) {
                $counts['gate']++;
            } elseif ($endTs < $now) {
                $counts['done']++;
            } else {
                $counts['up']++;
            }
        }

        // Apply tab filter
        if ($statusFilter !== 'all') {
            $allRdvs = $allRdvs->filter(function ($r) use ($statusFilter, $now) {
                $slotDate = $r['slot']['date'];
                $slotEnd = $r['slot']['end'];
                $endTs = strtotime("{$slotDate} {$slotEnd}:00") ?: $now;

                $st = 'confirme';
                if ($r['cancelled']) {
                    $st = 'annule';
                } elseif ($r['exitAt']) {
                    $st = 'termine';
                } elseif ($r['entryAt']) {
                    $st = 'au_port';
                } elseif ($r['arrivedAt']) {
                    $st = 'controle';
                } elseif ($endTs < $now) {
                    $st = 'manque';
                }

                return match ($statusFilter) {
                    'up' => $st === 'confirme',
                    'gate' => in_array($st, ['controle', 'bloque'], true),
                    'port' => $st === 'au_port',
                    'done' => in_array($st, ['termine', 'annule', 'manque'], true),
                    default => true,
                };
            })->values();
        }

        $selectedRdv = null;
        if ($selectedId) {
            $selectedRdv = $allRdvs->firstWhere('id', $selectedId);
            if (! $selectedRdv) {
                $extra = $allCamions->first(function ($c) use ($selectedId) {
                    $rdv = DemandeRdvPresenter::rdv($c, $c->demande);
                    return $rdv['id'] === $selectedId;
                });
                if ($extra) {
                    $selectedRdv = DemandeRdvPresenter::rdv($extra, $extra->demande);
                }
            }
        }

        return Inertia::render('Admin/Rdv/Index', [
            'rdvs' => $allRdvs,
            'counts' => $counts,
            'filters' => [
                'status' => $statusFilter,
                'q' => $search,
                'id' => $selectedId,
            ],
            'selected' => $selectedRdv,
        ]);
    }
}

