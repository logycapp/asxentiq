# Modulo Profile

## Que hace

Permite al usuario autenticado editar sus datos basicos y su fotografia personal.

## Como opera

- El frontend abre la pantalla desde `Ajustes del perfil`.
- El formulario carga el perfil actual del usuario autenticado.
- El usuario puede actualizar nombre, correo y fotografia JPG/PNG.
- Al guardar, el backend actualiza el registro y devuelve el perfil fresco.

## Flujo operativo

1. El usuario abre `/profile`.
2. El frontend consulta el perfil actual.
3. El formulario muestra nombre, correo y fotografia actual si existe.
4. El usuario cambia los datos o selecciona una imagen.
5. El frontend envia la actualizacion al backend.
6. La sesion local se sincroniza para reflejar los cambios.

## Backend relacionado

- `backend/app/Http/Controllers/Api/ProfileController.php`
- `backend/app/Models/User.php`
- `backend/database/migrations/2026_06_12_000011_add_profile_photo_path_to_users_table.php`
- `backend/routes/api.php`

## Frontend relacionado

- `frontend/src/app/features/profile/profile.component.ts`
- `frontend/src/app/features/profile/profile.component.html`
- `frontend/src/app/features/profile/profile.component.css`
- `frontend/src/app/core/services/profile.service.ts`
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/features/layout/layout-navbar.component.html`

## Endpoints

- `GET /api/profile`
- `POST /api/profile`

## Reglas importantes

- La fotografia debe ser JPG, JPEG o PNG.
- El tamano maximo permitido es 4 MB.
- El usuario solo actualiza su propio perfil.

## Estado actual

Implementado y enlazado desde el dropdown de perfil.

## Riesgos

- Si no existe `php artisan storage:link`, las fotografias publicas no se veran por URL.
- No determinado: si luego se agregaran mas campos personales.
