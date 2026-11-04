# Modulo Admin

## Que hace

Muestra una pagina de administracion dentro del area autenticada y expone accesos a Usuarios y Roles segun permisos del rol actual.

## Como opera

- Es una vista Angular simple dentro del layout autenticado.
- Consume los permisos de menu del rol actual.
- Si el rol actual tiene autorizados los items de Usuarios y Roles, muestra accesos rapidos.
- La configuracion puntual se hace desde los permisos de menu del rol.

## Flujo operativo

1. El usuario entra a `/admin`.
2. El guard de autenticacion lo permite.
3. El panel carga los permisos de menu del rol actual.
4. La vista muestra o oculta los accesos rapidos segun esos permisos.
5. Desde el panel hay un acceso directo para ajustar los permisos del rol.

## Backend relacionado

- `backend/app/Http/Controllers/Api/RoleController.php`
- `backend/app/Http/Controllers/Api/MenuController.php`

## Frontend relacionado

- `frontend/src/app/features/admin/admin-panel.component.ts`
- `frontend/src/app/features/layout/layout.component.ts`
- `frontend/src/app/core/services/role.service.ts`
- `frontend/src/app/core/services/auth.service.ts`

## Endpoints

- `GET /api/roles/{role}/menu-permissions`
- `PUT /api/roles/{role}/menu-permissions`

## Reglas importantes

- La pantalla depende de sesion activa.
- No parece tener logica funcional adicional en el estado actual.

## Estado actual

Implementado con accesos internos controlados por permisos de rol.

## Riesgos

- Si el rol actual no tiene permisos cargados, el panel no puede mostrar los accesos internos.
- No determinado: si mas adelante se agregaran otros accesos internos.
