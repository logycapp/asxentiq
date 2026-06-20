# Modulo Auth

## Que hace

Gestiona el inicio y cierre de sesion, ademas de la consulta del usuario autenticado.

## Como opera

- El backend valida credenciales en `AuthController`.
- Si el usuario es valido y esta activo, se crea un token Sanctum.
- El frontend guarda token y usuario en `localStorage`.
- El interceptor agrega el token en cada peticion protegida.

## Flujo operativo

1. El usuario ingresa email y password en `/login`.
2. El frontend llama `POST /api/login`.
3. El backend retorna token y usuario.
4. El frontend redirige a `/dashboard`.
5. Las rutas protegidas consumen la API con el token en `Authorization`.
6. `POST /api/logout` cierra la sesion.

## Backend relacionado

- `backend/app/Http/Controllers/Api/AuthController.php`
- `backend/routes/api.php`
- `backend/config/auth.php`
- `backend/config/sanctum.php`

## Frontend relacionado

- `frontend/src/app/features/auth/login.component.ts`
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/core/guards/auth.guard.ts`
- `frontend/src/app/core/guards/guest.guard.ts`
- `frontend/src/app/core/interceptors/auth.interceptor.ts`

## Endpoints

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`

## Reglas importantes

- El usuario debe estar activo.
- La API espera JSON.
- Las peticiones autenticadas dependen del token guardado en el navegador.

## Estado actual

- Implementado y conectado al frontend.

## Riesgos

- Si se borra el token localmente sin cerrar sesion, el frontend puede quedar desincronizado hasta que la API responda `401`.
- No determinado: politica de expiracion de token.
