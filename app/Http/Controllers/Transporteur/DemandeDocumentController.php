<?php

namespace App\Http\Controllers\Transporteur;

use App\Http\Controllers\Controller;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DemandeDocumentController extends Controller
{
    public function download(DemandeRdv $demande, DemandeDocument $document): StreamedResponse
    {
        $this->authorize('view', $demande);
        abort_unless($document->demande_rdv_id === $demande->id, 404);
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download(
            $document->path,
            basename($document->original_name),
            ['Content-Type' => $document->mime]
        );
    }
}
