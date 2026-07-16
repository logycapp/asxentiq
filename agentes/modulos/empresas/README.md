# Modulo Empresas

## Que hace

Gestiona el alta, edicion, consulta y eliminacion de empresas registradas en el sistema.

## Como opera

- El backend expone un CRUD simple protegido por `auth:sanctum` y `menu.access:/empresas`.
- El frontend muestra un listado con busqueda local y un formulario reactivo para crear o editar.
- El acceso al modulo depende del permiso de menu asignado al rol del usuario y el item aparece como subitem de `Administracion`.

## Flujo operativo

1. El usuario con permiso entra a `/empresas`.
2. Ve el listado de empresas registradas.
3. Puede crear una empresa nueva desde `/empresas/create`.
4. Puede editar una empresa existente desde `/empresas/:id/edit`.
5. Puede eliminar una empresa desde el listado.

## Campos

- `name` - nombre de la empresa
- `tax_id` - NIT o identificador fiscal
- `address` - direccion
- `phone` - telefono
- `email` - correo de contacto
- `active` - estado activo/inactivo

## Backend relacionado

- `backend/app/Models/Empresa.php`
- `backend/app/Http/Controllers/Api/EmpresaController.php`
- `backend/database/migrations/2026_07_16_000002_create_empresas_table.php`
- `backend/routes/api.php`
- `backend/database/seeders/DatabaseSeeder.php`

## Frontend relacionado

- `frontend/src/app/core/services/empresa.service.ts`
- `frontend/src/app/features/empresas/empresa-list.component.ts`
- `frontend/src/app/features/empresas/empresa-form.component.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/core/guards/module-access.guard.ts`

## Endpoints

- `GET /api/empresas`
- `POST /api/empresas`
- `GET /api/empresas/{empresa}`
- `PUT /api/empresas/{empresa}`
- `DELETE /api/empresas/{empresa}`
- `GET /api/users?empresa_id={empresa}` — Usuarios vinculados a una empresa

## Estado actual

- Implementado como modulo nuevo.

## Riesgos

- No determinado: si luego se necesitan relaciones con usuarios, sucursales o contratos.
