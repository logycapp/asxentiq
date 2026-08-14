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
  - `/empresas`
  - `/empresas/create`
  - `/empresas/:id/edit`
  - `/test`
  - `/users`
  - `/users/create`
  - `/users/create/:empresaId`
  - `/users/:empresaId`
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
- `EmpresaListComponent`
- `EmpresaFormComponent`
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
- `EmpresaService`: CRUD de empresas.
- `UserService`: CRUD de usuarios, activacion, desactivacion y permisos de menu.
- Los usuarios incluyen `empresa_id` y pueden listarse filtrados por empresa.
- `TestService`: envio de formulario con archivo.
- `LoadingService`: conteo de peticiones activas.

## Guards e interceptors

- `authGuard`: permite acceso solo si hay token en storage.
- `guestGuard`: manda a dashboard si ya hay token.
- `authInterceptor`: agrega `Bearer` y limpia la sesion ante `401`.

## Environments

- `environment.ts` apunta a `http://localhost:8000/api`.
- No determinado: otros entornos o configuraciones no visibles en el arbol revisado.

## Archivos publicos

- Los archivos que deban servirse directamente deben ubicarse dentro de `frontend/src/`.
- Cada archivo debe declararse en la lista `assets` de `frontend/angular.json` con la carpeta de salida requerida.
- Por ejemplo, `output: "zohoverify"` publica el archivo como `/zohoverify/nombre-del-archivo`.

## Consumo de API

- Login contra `POST /api/login`.
- Sesion actual contra `GET /api/me`.
- Logout contra `POST /api/logout`.
- Menu contra `GET /api/menu`.
- Perfil contra `GET /api/profile` y `POST /api/profile`.
- CRUD de roles contra `/api/roles`.
- CRUD de empresas contra `/api/empresas`.
- CRUD de usuarios contra `/api/users`.
- Formulario de prueba contra `POST /api/test`.

## Reglas para modificar frontend

- Mantener el enfoque standalone y las rutas existentes salvo necesidad justificada.
- Revisar solo componentes o servicios relacionados con la tarea.
- No cambiar contratos de API sin revisar su impacto en backend.
- Antes de tocar varios archivos, decir cuales y por que.
- Si un flujo no se puede confirmar, dejarlo como `No determinado`.
- El menu superior no debe exponer accesos directos a Usuarios y Roles.
- El menu superior no debe exponer accesos directos a Empresas salvo que el rol tenga permiso.
- La pantalla de perfil debe permitir editar nombre, correo y fotografia JPG/PNG.
- Para cualquier modulo, componente, formulario o estilo nuevo, usar exactamente la estetica, estructura y patrones visuales de `frontend/template`.
- No improvisar estilos nuevos ni variar el lenguaje visual del template.
- La unica excepcion es `landing`, que mantiene estilos propios por ser la pagina web publica.

## Componente SearchableSelect

- Ubicado en `frontend/src/app/shared/searchable-select.component.ts`.
- Es un componente Angular standalone que reemplaza un `<select>` nativo por un trigger con panel desplegable y búsqueda.
- Implementa `ControlValueAccessor`, por lo que funciona directamente con `[(ngModel)]`.
- Uso:
  ```html
  <app-searchable-select
    [options]="opciones"
    [(ngModel)]="valorSeleccionado"
    name="campo"
    placeholder="Texto por defecto"
  ></app-searchable-select>
  ```
- Las opciones se pasan como `SearchableOption[]` con formato `{ value: number | string | null, label: string }`.
- Si el valor es `null` se muestra el `placeholder`.
- Soporta modo claro/oscuro (`:host-context(.light)`).
- Cierra el panel al hacer clic fuera del componente.
- El estado de validación `is-invalid` se puede activar con el método `setInvalid()`.
- Basado en el patrón visual de `frontend/template/forms.html` (clases `searchable-select`, `searchable-select-trigger`, `searchable-select-panel`, `searchable-select-search`, `searchable-select-option`).

## DataTables2

- `DataTables2` es el patron estandar para tablas que combinan:
  - buscador
  - sorter
  - paginacion local
- Se usa cuando la lista ya esta cargada en memoria y se quiere mantener una experiencia uniforme entre modulos.
- No reemplaza una tabla con paginacion del backend; solo cubre colecciones locales o derivadas de una respuesta ya cargada.
- Estructura sugerida:
  - barra superior con accion principal y buscador
  - tabla con encabezados ordenables
  - footer con contador de registros y paginacion
- Flujo de uso:
  1. Cargar la lista base.
  2. Aplicar el filtro de busqueda.
  3. Ordenar el resultado.
  4. Calcular la pagina visible.
  5. Renderizar los controles debajo de la tabla.
- Reglas visuales:
  - Mantener el wrapper `card glass-card dashboard-table-card`.
  - Usar encabezados compactos y alineacion consistente.
  - Mostrar el texto `Mostrando X-Y de Z`.
  - Ocultar la paginacion si solo existe una pagina.
- Nombres recomendados en el componente:
  - `filteredItems`
  - `page`
  - `pageSize`
  - `totalPages`
  - `paginatedItems`
  - `startRecord`
  - `endRecord`
- Ejemplo base:
  ```html
  <div class="card glass-card dashboard-table-card border-0 rounded-4 overflow-hidden mb-4">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 dashboard-table">
        ...
      </table>
    </div>
    <div class="px-3 px-md-4 py-3 border-top border-white/10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
      <p class="text-on-surface-variant font-label-sm mb-0">
        Mostrando {{ startRecord }}-{{ endRecord }} de {{ totalFiltered }} registros
      </p>
      <nav *ngIf="totalPages > 1" aria-label="Paginacion">
        <ul class="pagination pagination-sm mb-0">
          ...
        </ul>
      </nav>
    </div>
  </div>
  ```
- Si un modulo ya tiene una tabla con buscador y sorter, adaptar esa vista a `DataTables2` en lugar de inventar una variante nueva.

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
