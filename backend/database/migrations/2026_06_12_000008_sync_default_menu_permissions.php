<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $roles = DB::table('roles')->pluck('id', 'slug');
        $menuItems = DB::table('menu_items')->pluck('id', 'route');

        $definitions = [
            '/dashboard' => ['admin', 'user'],
            '/users' => ['admin'],
            '/roles' => ['admin'],
            '/admin' => ['admin'],
        ];

        foreach ($definitions as $route => $roleSlugs) {
            $menuItemId = $menuItems[$route] ?? null;

            if (! $menuItemId) {
                continue;
            }

            DB::table('menu_item_role')->where('menu_item_id', $menuItemId)->delete();

            foreach ($roleSlugs as $slug) {
                $roleId = $roles[$slug] ?? null;

                if (! $roleId) {
                    continue;
                }

                DB::table('menu_item_role')->updateOrInsert(
                    [
                        'menu_item_id' => $menuItemId,
                        'role_id' => $roleId,
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
        $menuItems = DB::table('menu_items')->pluck('id', 'route');
        $dashboardId = $menuItems['/dashboard'] ?? null;
        $usersId = $menuItems['/users'] ?? null;
        $rolesId = $menuItems['/roles'] ?? null;
        $adminId = $menuItems['/admin'] ?? null;

        $ids = array_filter([$dashboardId, $usersId, $rolesId, $adminId]);

        if ($ids) {
            DB::table('menu_item_role')->whereIn('menu_item_id', $ids)->delete();
        }
    }
};
