<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('role_id')->nullable()->after('active');
        });

        $roleIds = DB::table('roles')->pluck('id', 'slug');

        foreach ($roleIds as $slug => $id) {
            DB::table('users')->where('role', $slug)->update(['role_id' => $id]);
        }

        DB::table('users')->whereNull('role_id')->update([
            'role_id' => $roleIds['user'] ?? $roleIds['admin'] ?? null,
        ]);

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('role');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 32)->default('user');
        });

        DB::table('users')->update([
            'role' => DB::raw("(SELECT slug FROM roles WHERE roles.id = users.role_id LIMIT 1)"),
        ]);

        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
        });
    }
};
