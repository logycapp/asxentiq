# Frontend Angular

## Que hace

El frontend es una aplicacion Angular standalone que consume la API Laravel para login, navegacion protegida, gestion de usuarios, roles, permisos de menu y una pantalla de prueba con subida de archivos.

La base visual del sistema es el template Bootstrap ubicado en `frontend/template`.
Todo el sistema debe operar bajo ese template como referencia de estetica y estructura visual.
La unica excepcion es `landing`, que corresponde a la pagina web publica y puede mantener su propio estilo.
Esa carpeta no tiene relacion directa con Angular: sus estilos, clases, componentes visuales y patrones deben copiarse y adaptarse dentro de la estructura original de Angular, sin inventar una variante visual nueva.

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
- Para cualquier modulo, componente, formulario o estilo nuevo, usar exactamente la estetica, estructura y patrones visuales de `frontend/template`.
- No improvisar estilos nuevos ni variar el lenguaje visual del template.
- La unica excepcion es `landing`, que mantiene estilos propios por ser la pagina web publica.

## Reglas para modales

- Usar `app-modal-shell` como contenedor base para cualquier modal nuevo o migrado.
- No duplicar la estructura visual completa del modal en cada componente si el contenido puede entrar por `ng-content`.
- Mantener en el shell la cabecera, el footer, el overlay, el boton de cierre y las variantes visuales.
- Dejar en el componente hijo solo el cuerpo especifico del formulario, vista o flujo.
- Configurar la cabecera con `headerVariant`, `kicker`, `title` y `subtitle`.
- Configurar el footer con `footerVariant`, `primaryLabel`, `secondaryLabel`, `showPrimaryButton`, `showSecondaryButton`, `primaryDisabled` y `primaryLoading`.
- Usar `showFooterClose` solo cuando el modal necesite un tercer cierre explicito; en caso contrario, preferir `secondaryRequested` o `closeRequested`.
- Si el modal es solo informativo, ocultar el boton principal y mostrar solo el cierre necesario.
- Si el modal ejecuta una accion principal, el boton principal debe disparar la accion del componente y no contener logica de negocio en el shell.
- Cuando un modal requiera comportamiento de pagina y modal, cerrar con `window.history.back()` solo si no existe un `activeModal` real.
- Evitar el markup inline de Bootstrap para modales nuevos salvo casos heredados que aun no hayan sido migrados.
- Si se detecta un modal nuevo fuera de `app-modal-shell`, documentar la excepcion como `No determinado` hasta decidir su migracion.
