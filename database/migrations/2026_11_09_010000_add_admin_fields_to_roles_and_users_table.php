<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('roles')) {
            Schema::table('roles', function (Blueprint $table) {
                if (! Schema::hasColumn('roles', 'description')) {
                    $table->text('description')->nullable();
                }
                if (! Schema::hasColumn('roles', 'kind')) {
                    $table->string('kind', 20)->default('interne');
                }
                if (! Schema::hasColumn('roles', 'is_system')) {
                    $table->boolean('is_system')->default(false);
                }
                if (! Schema::hasColumn('roles', 'is_locked')) {
                    $table->boolean('is_locked')->default(false);
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'fonction')) {
                    $table->string('fonction')->nullable();
                }
                if (! Schema::hasColumn('users', 'last_login_at')) {
                    $table->timestamp('last_login_at')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'last_login_at')) {
                    $table->dropColumn('last_login_at');
                }
                if (Schema::hasColumn('users', 'fonction')) {
                    $table->dropColumn('fonction');
                }
            });
        }

        if (Schema::hasTable('roles')) {
            Schema::table('roles', function (Blueprint $table) {
                if (Schema::hasColumn('roles', 'is_locked')) {
                    $table->dropColumn('is_locked');
                }
                if (Schema::hasColumn('roles', 'is_system')) {
                    $table->dropColumn('is_system');
                }
                if (Schema::hasColumn('roles', 'kind')) {
                    $table->dropColumn('kind');
                }
                if (Schema::hasColumn('roles', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }
    }
};

