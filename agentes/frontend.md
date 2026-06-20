# Frontend Angular

## Que hace

El frontend es una aplicacion Angular standalone que consume la API Laravel para login, navegacion protegida, gestion de usuarios, roles, permisos de menu y una pantalla de prueba con subida de archivos.

## Como opera

- El punto de entrada esta en `frontend/src/main.ts`.
- Las rutas estan en `frontend/src/app/app.routes.ts`.
- `AppComponent` solo renderiza `router-outlet`.
- `authInterceptor` agrega el token al header `Authorization`.
- `authGuard` protege rutas autenticadas.
- `guestGuard` evita acceder a `/login` cuando ya existe sesion.
- `LoadingService` centraliza el estado de carga.

## Rutas

- Publica:
  - `/login`
- Protegidas por layout y `authGuard`:
  - `/dashboard`
  - `/admin`
  - `/roles`
  - `/roles/create`
  - `/roles/:id/edit`
  - `/roles/:id/menu-permissions`
  - `/test`
  - `/users`
  - `/users/create`
  - `/users/:id/edit`
  - `/users/:id/menu-permissions`
- Fallback:
  - `**` a pagina no encontrada

## Componentes

- `LoginComponent`
- `LayoutComponent`
- `LayoutNavbarComponent`
- `DashboardComponent`
- `AdminPanelComponent`
- `RoleListComponent`
- `RoleFormComponent`
- `RoleMenuPermissionsComponent`
- `UserListComponent`
- `UserFormComponent`
- `UserMenuPermissionsComponent`
- `TestFormComponent`
- `NotFoundComponent`

## Servicios

- `AuthService`: login, logout, `me`, token y sesion local.
- `MenuService`: menu dinamico del usuario autenticado.
- `ProfileService`: carga y guarda el perfil del usuario autenticado.
- `RoleService`: CRUD de roles y permisos de menu.
- `UserService`: CRUD de usuarios, activacion, desactivacion y permisos de menu.
- `TestService`: envio de formulario con archivo.
- `LoadingService`: conteo de peticiones activas.

## Guards e interceptors

- `authGuard`: permite acceso solo si hay token en storage.
- `guestGuard`: manda a dashboard si ya hay token.
- `authInterceptor`: agrega `Bearer` y limpia la sesion ante `401`.

## Environments

- `environment.ts` apunta a `http://localhost:8000/api`.
- No determinado: otros entornos o configuraciones no visibles en el arbol revisado.

## Consumo de API

- Login contra `POST /api/login`.
- Sesion actual contra `GET /api/me`.
- Logout contra `POST /api/logout`.
- Menu contra `GET /api/menu`.
- Perfil contra `GET /api/profile` y `POST /api/profile`.
- CRUD de roles contra `/api/roles`.
- CRUD de usuarios contra `/api/users`.
- Formulario de prueba contra `POST /api/test`.

## Reglas para modificar frontend

- Mantener el enfoque standalone y las rutas existentes salvo necesidad justificada.
- Revisar solo componentes o servicios relacionados con la tarea.
- No cambiar contratos de API sin revisar su impacto en backend.
- Antes de tocar varios archivos, decir cuales y por que.
- Si un flujo no se puede confirmar, dejarlo como `No determinado`.
- El menu superior no debe exponer accesos directos a Usuarios y Roles.
- La pantalla de perfil debe permitir editar nombre, correo y fotografia JPG/PNG.
