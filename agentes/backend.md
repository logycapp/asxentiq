# Backend Laravel

## Que hace

El backend expone una API REST para autenticacion, usuarios, roles, menu y una ruta de prueba para carga de archivos.

## Como opera

- La API principal vive en `backend/routes/api.php`.
- El arranque de rutas se configura en `backend/bootstrap/app.php`.
- `ForceJsonResponse` obliga respuestas JSON en las rutas API.
- `Authenticate` redirige a `/` cuando la peticion no espera JSON.
- La autenticacion usa Sanctum y tokens personales.

## Rutas

- Auth:
  - `POST /api/login`
  - `GET /api/me`
  - `POST /api/logout`
- Menu:
  - `GET /api/menu`
- Test:
  - `POST /api/test`
- Profile:
  - `GET /api/profile`
  - `POST /api/profile`
- Roles:
  - `GET /api/roles`
  - `POST /api/roles`
  - `GET /api/roles/{role}`
  - `PUT /api/roles/{role}`
  - `GET /api/roles/{role}/menu-permissions`
  - `PUT /api/roles/{role}/menu-permissions`
  - `DELETE /api/roles/{role}`
- Users:
  - `GET /api/users`
  - `POST /api/users`
  - `GET /api/users/{user}`
  - `PUT /api/users/{user}`
  - `GET /api/users/{user}/menu-permissions`
  - `PUT /api/users/{user}/menu-permissions`
  - `PATCH /api/users/{user}/activate`
  - `PATCH /api/users/{user}/deactivate`
  - `DELETE /api/users/{user}`

## Controladores

- `AuthController`: login, perfil actual y logout.
- `MenuController`: menu visible para el usuario autenticado.
- `RoleController`: CRUD de roles y permisos de menu por rol.
- `UserController`: CRUD de usuarios, activacion/inactivacion y permisos de menu por usuario.
- `TestController`: recibe `dato1`, `dato2` y un archivo adjunto.

## Modelos

- `User`: relacion con `Role` y `MenuItem`, token API con Sanctum, atributo calculado `role`.
- `Role`: relacion muchos a muchos con `MenuItem`.
- `MenuItem`: relacion con rol directo, roles y usuarios.
- `User`: incluye fotografia de perfil via `profile_photo_path`.

## Migraciones

- `users`
- `roles`
- `menu_items`
- `menu_item_role`
- `user_menu_item`
- `personal_access_tokens`
- migraciones de ajuste de `role` a `role_id`

## Autenticacion

- Existe autenticacion con Sanctum.
- El login valida email y password.
- El usuario debe estar activo.
- Al iniciar sesion se borran tokens anteriores y se crea un token nuevo.
- `GET /api/me` devuelve el usuario autenticado con su rol relacionado.
- La visibilidad de Usuarios y Roles se controla por permisos de menu del rol actual.
- El perfil del usuario autenticado se actualiza por sus propias rutas de perfil.

## Reglas para modificar backend

- Revisar solo archivos relacionados con la tarea.
- No tocar logica ajena al cambio pedido.
- Mantener validaciones y contratos de respuesta existentes cuando sea posible.
- Si el impacto en autenticacion, roles o permisos no es claro, detenerse y documentar `No determinado`.
