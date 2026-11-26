<?php

namespace Database\Seeders;

use App\Domain\Access\Models\NavigationItem;
use App\Domain\Access\Models\Permission;
use App\Domain\Access\Models\Role;
use Illuminate\Database\Seeder;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Role::query()->updateOrCreate(['slug' => 'admin'], ['name' => 'Administrador']);
        $member = Role::query()->updateOrCreate(['slug' => 'member'], ['name' => 'Usuario']);

        $definitions = [
            'dashboard.view' => ['name' => 'Indicadores', 'route' => 'dashboard'],
            'users.manage' => ['name' => 'Usuarios', 'route' => 'users.index'],
            'users.unlock' => ['name' => 'Desbloquear usuarios', 'route' => null],
            'people.manage' => ['name' => 'Personas', 'route' => null],
            'imports.manage' => ['name' => 'Carga masiva', 'route' => 'imports.create'],
            'profile.view' => ['name' => 'Bienvenida', 'route' => 'welcome'],
            'profile.update-own' => ['name' => 'Editar datos propios', 'route' => null],
        ];
        $permissions = [];

        foreach ($definitions as $slug => $definition) {
            $permission = Permission::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $definition['name']],
            );
            $permissions[$slug] = $permission;

            if ($definition['route'] !== null) {
                NavigationItem::query()->updateOrCreate(
                    ['permission_id' => $permission->id, 'route_name' => $definition['route']],
                    [
                        'label' => $definition['name'],
                        'icon_key' => $slug,
                        'sort_order' => count($permissions),
                        'is_active' => true,
                    ],
                );
            }
        }

        $admin->permissions()->sync(collect($permissions)->pluck('id')->all());
        $member->permissions()->sync([
            $permissions['profile.view']->id,
            $permissions['profile.update-own']->id,
        ]);
    }
}
