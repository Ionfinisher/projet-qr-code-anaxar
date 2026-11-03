<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('roles', 'created_by')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->unsignedBigInteger('created_by')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('roles', 'created_by')) {
            Schema::table('roles', fn (Blueprint $table) => $table->dropColumn('created_by'));
        }
    }
};
