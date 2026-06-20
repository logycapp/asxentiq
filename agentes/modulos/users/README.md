# Modulo Users

## Que hace

Gestiona el listado, alta, edicion, activacion, desactivacion, eliminacion y permisos de menu por usuario.

## Como opera

- El backend expone CRUD y acciones de estado.
- El frontend usa formularios reactivos y lista los usuarios con acciones directas.
- Los permisos de menu por usuario se manejan como asignacion directa de items.

## Flujo operativo

1. Se consulta el listado desde `/users`.
2. Se puede crear o editar un usuario.
3. Se puede activar o desactivar.
4. Se puede asignar menu directo a un usuario.
5. El backend devuelve el estado con el rol relacionado.

## Backend relacionado

- `backend/app/Http/Controllers/Api/UserController.php`
- `backend/app/Models/User.php`
- `backend/app/Models/Role.php`
- `backend/app/Models/MenuItem.php`
- `backend/database/migrations/2026_06_09_000001_add_role_to_users_table.php`
- `backend/database/migrations/2026_06_09_000004_replace_users_role_with_role_id.php`
- `backend/database/migrations/2026_06_12_000007_create_user_menu_item_table.php`

## Frontend relacionado

- `frontend/src/app/features/users/user-list.component.ts`
- `frontend/src/app/features/users/user-form.component.ts`
- `frontend/src/app/features/users/user-menu-permissions.component.ts`
- `frontend/src/app/core/services/user.service.ts`
- `frontend/src/app/core/services/role.service.ts`

## Endpoints

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{user}`
- `PUT /api/users/{user}`
- `GET /api/users/{user}/menu-permissions`
- `PUT /api/users/{user}/menu-permissions`
- `PATCH /api/users/{user}/activate`
- `PATCH /api/users/{user}/deactivate`
- `DELETE /api/users/{user}`

## Reglas importantes

- El email debe ser unico.
- La contrasena es opcional en edicion pero obligatoria en creacion.
- La desactivacion elimina tokens activos.
- El formulario usa un rol por slug, no por nombre visible.

## Estado actual

- Implementado y conectado al backend.

## Riesgos

- La eliminacion de un usuario invalida tokens y puede afectar sesiones abiertas.
- No determinado: reglas de negocio extra para usuarios especiales.
