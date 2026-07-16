# Mapa del proyecto

## Que parece hacer

Asxentiq parece ser un sistema web de administracion con autenticacion, gestion de usuarios, gestion de roles y control de permisos de menu. El frontend consume una API Laravel y el acceso se protege con Sanctum y tokens personales.
La interfaz del sistema debe seguir el template Bootstrap ubicado en `frontend/template` como base visual obligatoria. La unica excepcion es `landing`, que funciona como pagina web publica y puede conservar su propio diseño.
Esa carpeta es una referencia visual independiente y no tiene relacion directa con Angular; por eso, sus estilos, clases y componentes visuales deben copiarse y adaptarse a la estructura original de Angular.

## Estructura principal

- `backend/`: API Laravel
- `frontend/`: aplicacion Angular basada en el template Bootstrap de `frontend/template`
- `start.sh`: arranque conjunto de backend y frontend

## Tecnologias detectadas

- PHP 8.2
- Laravel 11
- Laravel Sanctum
- MySQL
- Angular 18 standalone
- RxJS
- Bootstrap 5
- `@ng-bootstrap/ng-bootstrap`
- Template Bootstrap propio en `frontend/template`

## Como arranca

- `start.sh` prepara `backend/.env` si falta.
- Configura variables locales para Laravel.
- Verifica o crea la base de datos `asxentiq`.
- Ejecuta `php artisan migrate --seed --force`.
- Arranca Laravel en `http://localhost:8000`.
- Instala dependencias de Angular si faltan.
- Arranca Angular en `http://localhost:4200`.

## Modulos detectados

- Auth
- Users
- Roles
- Menu
- Profile
- Test
- Dashboard
- Admin
- Trainings (Capacitaciones)

## Rutas Laravel detectadas

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- `GET /api/menu`
- `POST /api/test`
- `GET /api/profile`
- `POST /api/profile`
- `GET /api/roles`
- `POST /api/roles`
- `GET /api/roles/{role}`
- `PUT /api/roles/{role}`
- `GET /api/roles/{role}/menu-permissions`
- `PUT /api/roles/{role}/menu-permissions`
- `DELETE /api/roles/{role}`
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{user}`
- `PUT /api/users/{user}`
- `GET /api/users/{user}/menu-permissions`
- `PUT /api/users/{user}/menu-permissions`
- `PATCH /api/users/{user}/activate`
- `PATCH /api/users/{user}/deactivate`
- `DELETE /api/users/{user}`
- `GET /{any}` en `web.php`, con redireccion al frontend

## Rutas Angular detectadas

- `/login`
- `/dashboard`
- `/admin`
- `/profile`
- `/roles`
- `/roles/create`
- `/roles/:id/edit`
- `/roles/:id/menu-permissions`
- `/test`
- `/users`
- `/users/create`
- `/users/:id/edit`
- `/users/:id/menu-permissions`
- `/trainings`
- `/trainings/create`
- `/trainings/:id/edit`
- `/trainings/:id/questions`
- `/trainings/:id/assign`
- `/trainings/:id/results`
- `/public/trainings`
- `/public/trainings/dashboard`
- `/public/trainings/:id/take`
- `/public/trainings/:id/result`
- `**` para pagina no encontrada

## Endpoints detectados

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`
- `GET /api/menu`
- `POST /api/test`
- `GET /api/profile`
- `POST /api/profile`
- CRUD de roles en `/api/roles`
- CRUD de usuarios en `/api/users`
- endpoints de permisos de menu para roles y usuarios
- CRUD de capacitaciones en `/api/trainings`
- CRUD de preguntas en `/api/questions`
- Rutas publicas en `/api/public/trainings/*` (acceso por cedula)
- Descarga de certificados en `/api/public/trainings/{id}/certificate`

## Observaciones importantes

- El frontend usa `localStorage` para guardar token y usuario.
- El interceptor Angular agrega `Authorization: Bearer <token>`.
- La API fuerza respuestas JSON.
- CORS permite el frontend local y soporta credenciales.
- El backend protege la mayoria de rutas con `auth:sanctum`.
- Cualquier modulo, componente, formulario o estilo nuevo en Angular debe respetar exactamente la estetica, estructura y patrones visuales de `frontend/template`.
- No se deben improvisar estilos nuevos fuera del template, salvo en `landing`.
- El seeder crea roles base, un usuario administrador y items de menu iniciales.
- El menu principal ya no expone `Usuarios` ni `Roles`; esos accesos viven dentro de `Administracion`.
- La visibilidad interna de `Usuarios` y `Roles` se controla con permisos de rol y permisos puntuales sobre los items de menu.
- `Ajustes del perfil` permite editar nombre, correo y fotografia del usuario autenticado.
- La configuracion local espera MySQL en `127.0.0.1:3307` con base `asxentiq`.
- No determinado: si existen otros modulos funcionales fuera de los archivos detectados.
