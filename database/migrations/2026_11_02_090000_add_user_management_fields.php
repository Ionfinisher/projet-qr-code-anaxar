<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'must_change_password')) {
                $table->boolean('must_change_password')->default(false);
            }
        });

        if (Schema::hasTable('roles') && ! Schema::hasColumn('roles', 'created_by')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->unsignedBigInteger('created_by')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'created_by')) {
            Schema::table('roles', fn (Blueprint $table) => $table->dropColumn('created_by'));
        }

        if (Schema::hasColumn('users', 'must_change_password')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('must_change_password'));
        }
    }
};
