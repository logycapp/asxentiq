# Modulo Roles

## Que hace

Gestiona el CRUD de roles y la asignacion de permisos de menu por rol.

## Como opera

- El backend guarda roles con `name`, `slug`, `description` e indicador de sistema.
- El frontend permite crear, editar, listar y eliminar roles.
- Los permisos de menu se guardan en la relacion muchos a muchos con `menu_items`.

## Flujo operativo

1. Se consulta el listado de roles.
2. Se crea o edita un rol.
3. Se abre la pantalla de permisos de menu.
4. Se sincronizan los items seleccionados.
5. El backend evita borrar roles del sistema o roles en uso.

## Backend relacionado

- `backend/app/Http/Controllers/Api/RoleController.php`
- `backend/app/Models/Role.php`
- `backend/database/migrations/2026_06_09_000003_create_roles_table.php`
- `backend/database/migrations/2026_06_09_000006_create_menu_item_role_table.php`

## Frontend relacionado

- `frontend/src/app/features/roles/role-list.component.ts`
- `frontend/src/app/features/roles/role-form.component.ts`
- `frontend/src/app/features/roles/role-menu-permissions.component.ts`
- `frontend/src/app/core/services/role.service.ts`

## Endpoints

- `GET /api/roles`
- `POST /api/roles`
- `GET /api/roles/{role}`
- `PUT /api/roles/{role}`
- `GET /api/roles/{role}/menu-permissions`
- `PUT /api/roles/{role}/menu-permissions`
- `DELETE /api/roles/{role}`

## Reglas importantes

- El `slug` debe ser unico.
- Los roles del sistema no se eliminan.
- Un rol en uso no se elimina.
- Los permisos de menu se sincronizan, no se anexan parcialmente.

## Estado actual

- Implementado y conectado al backend.

## Riesgos

- Cambiar el `slug` puede impactar la lectura de permisos y la relacion con usuarios.
- No determinado: si existen roles adicionales fuera de los roles base.
