<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table): void {
            $table->foreignId('role_id')->nullable()->after('route');
        });

        $roleIds = DB::table('roles')->pluck('id', 'slug');

        DB::table('menu_items')
            ->where('role', 'all')
            ->update(['role_id' => null]);

        foreach ($roleIds as $slug => $id) {
            DB::table('menu_items')->where('role', $slug)->update(['role_id' => $id]);
        }

        Schema::table('menu_items', function (Blueprint $table): void {
            $table->dropUnique(['role', 'route']);
            $table->dropColumn('role');
        });

        Schema::table('menu_items', function (Blueprint $table): void {
            $table->foreign('role_id')->references('id')->on('roles');
            $table->unique(['role_id', 'route']);
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table): void {
            $table->string('role', 32)->default('all');
        });

        DB::table('menu_items')
            ->whereNull('role_id')
            ->update(['role' => 'all']);

        $roleSlugs = DB::table('roles')->pluck('slug', 'id');

        foreach ($roleSlugs as $id => $slug) {
            DB::table('menu_items')->where('role_id', $id)->update(['role' => $slug]);
        }

        Schema::table('menu_items', function (Blueprint $table): void {
            $table->dropForeign(['role_id']);
            $table->dropUnique(['role_id', 'route']);
            $table->dropColumn('role_id');
            $table->unique(['role', 'route']);
        });
    }
};
