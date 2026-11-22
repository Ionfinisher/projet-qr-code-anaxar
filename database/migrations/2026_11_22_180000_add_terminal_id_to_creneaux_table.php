<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure at least one terminal exists in case creneaux already exist
        if (Schema::hasTable('terminals') && DB::table('terminals')->count() === 0) {
            DB::table('terminals')->insert([
                'code' => 'LCT',
                'short' => 'LCT',
                'label' => 'Lomé Container Terminal',
                'statut' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $defaultTerminalId = DB::table('terminals')->where('code', 'LCT')->value('id')
            ?? DB::table('terminals')->value('id');

        // 2. Add terminal_id column to creneaux
        Schema::table('creneaux', function (Blueprint $table) use ($defaultTerminalId) {
            if (! Schema::hasColumn('creneaux', 'terminal_id')) {
                $table->foreignId('terminal_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('terminals')
                    ->cascadeOnDelete();
            }
        });

        // 3. Assign existing creneaux to the default terminal
        if ($defaultTerminalId) {
            DB::table('creneaux')->whereNull('terminal_id')->update(['terminal_id' => $defaultTerminalId]);
        }

        // 4. Update unique index from ['date', 'start'] to ['terminal_id', 'date', 'start']
        Schema::table('creneaux', function (Blueprint $table) {
            $isSqlite = DB::getDriverName() === 'sqlite';

            if (! $isSqlite) {
                try {
                    $table->dropUnique(['date', 'start']);
                } catch (\Throwable) {
                    // Ignore if unique index was named differently or already dropped
                }
            }

            try {
                $table->unique(['terminal_id', 'date', 'start'], 'creneaux_terminal_id_date_start_unique');
            } catch (\Throwable) {
                // Ignore if index already exists
            }
        });
    }

    public function down(): void
    {
        Schema::table('creneaux', function (Blueprint $table) {
            $isSqlite = DB::getDriverName() === 'sqlite';

            if (! $isSqlite) {
                try {
                    $table->dropUnique('creneaux_terminal_id_date_start_unique');
                } catch (\Throwable) {
                }

                try {
                    $table->unique(['date', 'start']);
                } catch (\Throwable) {
                }

                if (Schema::hasColumn('creneaux', 'terminal_id')) {
                    $table->dropForeign(['terminal_id']);
                    $table->dropColumn('terminal_id');
                }
            }
        });
    }
};
