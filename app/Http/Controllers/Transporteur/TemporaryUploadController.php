<?php

namespace App\Http\Controllers\Transporteur;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transporteur\StoreTemporaryUploadRequest;
use App\Models\TemporaryUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TemporaryUploadController extends Controller
{
    public function store(StoreTemporaryUploadRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $user = $request->user();
        $path = $file->store("rendez-vous/tmp/{$user->id}", 'local');

        if (! $path) {
            return response()->json(['message' => 'Dépôt du fichier impossible.'], 500);
        }

        $hash = hash_file('sha256', Storage::disk('local')->path($path));

        if ($hash === false) {
            Storage::disk('local')->delete($path);

            return response()->json(['message' => 'Lecture du fichier impossible.'], 500);
        }

        $upload = TemporaryUpload::create([
            'token' => (string) Str::uuid(),
            'user_id' => $user->id,
            'type' => $request->string('type')->toString(),
            'original_name' => Str::limit($file->getClientOriginalName(), 255, ''),
            'path' => $path,
            'mime' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => (int) $file->getSize(),
            'sha256' => $hash,
        ]);

        return response()->json([
            'token' => $upload->token,
            'name' => $upload->original_name,
            'size' => $upload->size,
            'mime' => $upload->mime,
            'sha256' => $upload->sha256,
        ], 201);
    }

    public function destroy(Request $request, TemporaryUpload $upload): Response
    {
        abort_unless($upload->user_id === $request->user()->id, 403);

        Storage::disk('local')->delete($upload->path);
        $upload->delete();

        return response()->noContent();
    }
}
