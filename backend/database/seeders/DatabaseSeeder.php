<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::query()->updateOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Administrador',
                'description' => 'Acceso total al sistema.',
                'is_system' => true,
            ]
        );

        $userRole = Role::query()->updateOrCreate(
            ['slug' => 'user'],
            [
                'name' => 'Usuario',
                'description' => 'Acceso estandar al panel.',
                'is_system' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@asxentiq.com'],
            [
                'name' => 'Administrador',
                'password' => 'Admin12345*',
                'active' => true,
                'role' => $adminRole->id,
            ]
        );

        $dashboardItem = MenuItem::query()->updateOrCreate(
            ['route' => '/dashboard'],
            [
                'label' => 'Dashboard',
                'icon' => 'grid',
                'sort_order' => 10,
                'role_id' => null,
                'enabled' => true,
                'exact' => true,
            ]
        );

        $usersItem = MenuItem::query()->updateOrCreate(
            ['route' => '/users'],
            [
                'label' => 'Usuarios',
                'icon' => 'people',
                'sort_order' => 20,
                'role_id' => null,
                'enabled' => true,
                'exact' => false,
            ]
        );

        $rolesItem = MenuItem::query()->updateOrCreate(
            ['route' => '/roles'],
            [
                'label' => 'Roles',
                'icon' => 'shield-check',
                'sort_order' => 25,
                'role_id' => null,
                'enabled' => true,
                'exact' => false,
            ]
        );

        $adminItem = MenuItem::query()->updateOrCreate(
            ['route' => '/admin'],
            [
                'label' => 'Administracion',
                'icon' => 'shield-lock',
                'sort_order' => 30,
                'role_id' => null,
                'enabled' => true,
                'exact' => true,
            ]
        );

        $empresasItem = MenuItem::query()->updateOrCreate(
            ['route' => '/empresas'],
            [
                'label' => 'Empresas',
                'icon' => 'building',
                'sort_order' => 10,
                'parent_id' => $adminItem->id,
                'role_id' => null,
                'enabled' => true,
                'exact' => false,
            ]
        );

        $trainingsItem = MenuItem::query()->updateOrCreate(
            ['route' => '/trainings'],
            [
                'label' => 'Capacitaciones',
                'icon' => 'book',
                'sort_order' => 35,
                'role_id' => null,
                'enabled' => true,
                'exact' => false,
            ]
        );

        $participantsItem = MenuItem::query()->updateOrCreate(
            ['route' => '/trainings/participants'],
            [
                'label' => 'Participantes',
                'icon' => 'people',
                'sort_order' => 5,
                'parent_id' => $trainingsItem->id,
                'role_id' => null,
                'enabled' => true,
                'exact' => true,
            ]
        );

        $dashboardItem->roles()->sync([$adminRole->id, $userRole->id]);
        $usersItem->roles()->sync([$adminRole->id]);
        $rolesItem->roles()->sync([$adminRole->id]);
        $empresasItem->roles()->sync([$adminRole->id]);
        $adminItem->roles()->sync([$adminRole->id]);
        $trainingsItem->roles()->sync([$adminRole->id]);
        $participantsItem->roles()->sync([$adminRole->id]);
    }
}
