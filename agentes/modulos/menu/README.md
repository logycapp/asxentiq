# Modulo Menu

## Que hace

Entrega el menu visible para el usuario autenticado segun su rol y permisos directos.

## Como opera

- El backend construye la lista de items habilitados para el usuario.
- Se consideran asignaciones por rol y asignaciones directas a usuario.
- El frontend carga el menu al entrar al layout autenticado.
- `Usuarios` y `Roles` no se muestran en el menu principal.

## Flujo operativo

1. El usuario inicia sesion.
2. El layout protegido pide `GET /api/menu`.
3. El backend filtra items habilitados y autorizados.
4. El navbar renderiza los links disponibles.

## Backend relacionado

- `backend/app/Http/Controllers/Api/MenuController.php`
- `backend/app/Models/MenuItem.php`
- `backend/database/migrations/2026_06_09_000002_create_menu_items_table.php`
- `backend/database/migrations/2026_06_09_000005_replace_menu_role_with_role_id.php`
- `backend/database/migrations/2026_06_09_000006_create_menu_item_role_table.php`
- `backend/database/migrations/2026_06_12_000007_create_user_menu_item_table.php`
- `backend/database/migrations/2026_06_12_000008_sync_default_menu_permissions.php`

## Frontend relacionado

- `frontend/src/app/features/layout/layout.component.ts`
- `frontend/src/app/features/layout/layout-navbar.component.ts`
- `frontend/src/app/core/services/menu.service.ts`

## Endpoints

- `GET /api/menu`

## Reglas importantes

- Solo se muestran items `enabled`.
- El orden depende de `sort_order` y `id`.
- La ruta del menu debe coincidir con las rutas del frontend.
- Las rutas `users` y `roles` quedan reservadas para el acceso interno desde Administracion.
- Los permisos puntuales siguen pudiendo habilitar acceso directo a un usuario o rol.

## Estado actual

- Implementado y usado por el layout principal.

## Riesgos

- Si un item no coincide con una ruta Angular, puede mostrar enlaces rotos.
- No determinado: si existen reglas de visibilidad fuera del rol y del usuario.
