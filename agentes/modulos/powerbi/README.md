# Modulo Power BI

## Que hace

Permite cargar un archivo Excel y generar graficas a partir de una hoja y una columna numerica.

## Como opera

- El frontend envía el Excel como `FormData`.
- El backend lee el libro, detecta hojas, columnas y filas.
- La persistencia usa la tabla `powerbi_datas`.
- El frontend permite elegir hoja, columna de etiqueta y columna numerica.
- La vista genera una grafica de barras y una grafica de linea con los datos seleccionados.

## Flujo operativo

1. El usuario entra a `/powerbi`.
2. Selecciona un archivo `.xlsx` o `.xls`.
3. El frontend envia `POST /api/powerbi/import`.
4. El backend guarda la data en `powerbi_datas`.
5. El frontend consulta `GET /api/powerbi/dashboard`.
6. El backend devuelve filtros, KPI, graficas y registros.
7. El frontend renderiza el dashboard.

## Backend relacionado

- `backend/app/Http/Controllers/Api/PowerbiController.php`
- `backend/routes/api.php`
- `backend/database/seeders/DatabaseSeeder.php`
- `backend/database/migrations/2026_06_12_000008_sync_default_menu_permissions.php`
- `backend/database/migrations/2026_08_14_000001_create_powerbi_datas_table.php`

## Frontend relacionado

- `frontend/src/app/features/powerbi/powerbi.component.ts`
- `frontend/src/app/features/powerbi/powerbi.component.html`
- `frontend/src/app/features/powerbi/powerbi.component.css`
- `frontend/src/app/core/services/powerbi.service.ts`

## Endpoints

- `POST /api/powerbi/preview`
- `POST /api/powerbi/import`
- `GET /api/powerbi/dashboard`

## Reglas importantes

- El archivo debe ser Excel `.xlsx` o `.xls`.
- El tamanio maximo configurado es de 20 MB.
- La hoja debe contener al menos una columna numerica para construir graficas utiles.
- La data persiste en la tabla `powerbi_datas`.

## Estado actual

- Implementado como modulo autenticado.

## Riesgos

- Archivos grandes pueden hacer lenta la carga en navegador.
- No determinado: exportacion de graficas o almacenamiento historico.
