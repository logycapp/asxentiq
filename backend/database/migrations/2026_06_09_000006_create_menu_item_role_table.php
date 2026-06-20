<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_role', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('menu_item_id')->constrained('menu_items')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['menu_item_id', 'role_id']);
        });

        $menuItems = DB::table('menu_items')
            ->whereNotNull('role_id')
            ->select(['id', 'role_id'])
            ->get();

        foreach ($menuItems as $menuItem) {
            DB::table('menu_item_role')->updateOrInsert(
                [
                    'menu_item_id' => $menuItem->id,
                    'role_id' => $menuItem->role_id,
                ],
                [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_role');
    }
};
