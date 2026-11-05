<?php

namespace App\Console\Commands;

use App\Models\TemporaryUpload;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneTemporaryUploads extends Command
{
    protected $signature = 'uploads:prune {--hours=24}';

    protected $description = 'Supprime les fichiers téléversés temporairement et non rattachés à une demande.';

    public function handle(): int
    {
        $hours = max(1, (int) $this->option('hours'));

        $uploads = TemporaryUpload::query()
            ->where('created_at', '<', now()->subHours($hours))
            ->get();

        foreach ($uploads as $upload) {
            Storage::disk('local')->delete($upload->path);
            $upload->delete();
        }

        $this->info($uploads->count().' fichier(s) temporaire(s) supprimé(s).');

        return self::SUCCESS;
    }
}
