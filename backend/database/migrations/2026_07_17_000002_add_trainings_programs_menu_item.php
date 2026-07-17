<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $adminRoleId = DB::table('roles')->where('slug', 'admin')->value('id');
        $trainingsItemId = DB::table('menu_items')->where('route', '/trainings')->value('id');

        if (! $trainingsItemId) {
            return;
        }

        $programsItemId = DB::table('menu_items')->updateOrInsert(
            ['route' => '/trainings_programs'],
            [
                'label' => 'Programas',
                'icon' => 'category',
                'sort_order' => 1,
                'role_id' => null,
                'parent_id' => $trainingsItemId,
                'enabled' => true,
                'exact' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        if ($adminRoleId) {
            $menuItemId = DB::table('menu_items')->where('route', '/trainings_programs')->value('id');

            if ($menuItemId) {
                DB::table('menu_item_role')->updateOrInsert(
                    [
                        'menu_item_id' => $menuItemId,
                        'role_id' => $adminRoleId,
                    ],
                    [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        $menuItemId = DB::table('menu_items')->where('route', '/trainings_programs')->value('id');

        if ($menuItemId) {
            DB::table('menu_item_role')->where('menu_item_id', $menuItemId)->delete();
            DB::table('menu_items')->where('id', $menuItemId)->delete();
        }
    }
};
