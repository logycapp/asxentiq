# Modulo Power BI

## Que hace

Sistema de **proyectos de visualización** por empresa: cada proyecto tiene **datasets** (archivos CSV, esquema dinámico por carga) y **visualizaciones configuradas y persistidas**, con una **URL pública** para compartir el resultado final sin login.

Reemplaza el módulo anterior que importaba un Excel de esquema fijo a `powerbi_datas`.

## Como opera

- Cada proyecto pertenece a una empresa (`powerbi_projects.empresa_id`).
- Un archivo CSV = un dataset (`powerbi_datasets`); las filas se guardan completas en `powerbi_rows` (JSON llaveado por column key) y el esquema en `powerbi_datasets.columns`.
- El parseo de CSV normaliza: encoding a UTF-8 (BOM UTF-8/UTF-16, Windows-1252/latin1), delimitador detectado (`,` `;` tab `|`) respetando comillas, caracteres `ñ`/acentos en NFC y comillas escapadas.
- Las visualizaciones (`powerbi_visualizations`) definen `chart_type` (`bar|line|area|pie|kpi|table`) y `config` (`label_column`, `value_column`, `aggregation`, `date_grouping`). La agregación se calcula en PHP sobre las filas JSON.
- Al publicar, se genera `public_token` (UUID). La ruta `/public/powerbi/{token}` muestra el panel en modo claro, solo lectura, con filtros de causal, fecha, municipio, departamento y mecanismo. Despublicar revoca la URL y regenerar token invalida la anterior.
- Código personalizado por proyecto: clase PHP whitelistada en `config/powerbi.php` (`transformers`), referenciada desde `powerbi_projects.handler`. El parseo genérico corre primero y la clase post-procesa columnas/filas en import; nunca se instancia una clase desde input del usuario.

## Flujo operativo

1. El usuario entra a `/powerbi` y crea un proyecto asociado a una empresa (con `handler` opcional).
2. En el detalle del proyecto (tab Datos) sube un CSV: el backend devuelve una vista previa (columnas, tipos, muestra) y al confirmar se importa como dataset.
3. En la tab Visualizaciones selecciona un dataset, aplica filtros (rangos de fecha + columnas texto de baja cardinalidad) y crea visualizaciones (bar, line, area, pie, KPI, table).
4. En la tab Compartir publica el proyecto y copia la URL pública.
5. Cualquier persona abre `/public/powerbi/{token}` sin iniciar sesión, aplica filtros y ve las visualizaciones actualizadas en modo claro.

## Persistencia

- `powerbi_projects`: `empresa_id`, `name`, `description`, `status` (`draft|published`), `public_token`, `handler`.
- `powerbi_datasets`: `project_id`, `source_file`, `row_count`, `columns` (JSON), `delimiter`, `encoding`, `imported_at`.
- `powerbi_rows`: `dataset_id`, `source_row_number`, `data` (JSON).
- `powerbi_visualizations`: `project_id`, `dataset_id`, `title`, `chart_type`, `config` (JSON), `sort_order`.

## Backend relacionado

- `backend/app/Http/Controllers/Api/PowerbiController.php`
- `backend/app/Http/Controllers/Api/PublicPowerbiController.php`
- `backend/app/Services/PowerbiProjectService.php`
- `backend/app/Services/PowerbiCsvService.php`
- `backend/app/Services/PowerbiAnalyticsService.php`
- `backend/app/Contracts/PowerbiTransformerContract.php`
- `backend/app/PowerbiTransformers/`
- `backend/config/powerbi.php`
- `backend/routes/api.php`
- `backend/database/migrations/2026_08_22_000001..000005` (tablas nuevas + migración de `powerbi_datas`)

## Frontend relacionado

- `frontend/src/app/features/powerbi/powerbi-project-list.component.ts`
- `frontend/src/app/features/powerbi/powerbi-project-detail.component.ts`
- `frontend/src/app/features/powerbi/public-powerbi.component.ts`
- `frontend/src/app/features/powerbi/powerbi-chart.component.ts`
- `frontend/src/app/core/services/powerbi.service.ts`
- `frontend/src/app/app.routes.ts`

## Endpoints

- `GET /api/powerbi/transformers`
- CRUD de proyectos en `/api/powerbi/projects`
- `POST /api/powerbi/projects/{project}/publish|unpublish|regenerate-token`
- `POST /api/powerbi/projects/{project}/datasets/preview`
- `POST /api/powerbi/projects/{project}/datasets` (import CSV)
- `GET /api/powerbi/projects/{project}/datasets`
- `DELETE /api/powerbi/datasets/{dataset}`
- CRUD de visualizaciones en `/api/powerbi/projects/{project}/visualizations` y `/api/powerbi/visualizations/{visualization}`
- `GET /api/powerbi/projects/{project}/dashboard` (query: `dataset_id`, `filters[columna]`, `filters[fecha][from|to]`)
- `GET /api/public/powerbi/{token}` (pública, sin auth; admite `dataset_id`, `filters[columna]` y `filters[fecha][from|to]`)

## Reglas importantes

- El archivo debe ser CSV o TXT (`mimes:csv,txt`), máximo 20 MB.
- Solo el rol admin gestiona el módulo (`menu.access:/powerbi`, sin cambio en el menú).
- `handler` solo acepta claves del registro `config/powerbi.php` (whitelist).
- Si cambia la lógica de un transformer, el dataset debe re-importarse.
- `public_token` regenerado invalida la URL anterior; no se conservan URLs históricas.
- El dashboard autenticado y la vista pública usan tabs por dataset con filtros; la vista pública es de solo lectura.

## Estado actual

- Implementado como módulo autenticado con vista pública de solo lectura.

## Riesgos

- Agregación en PHP sobre filas JSON es adecuada para volumen moderado (<100k filas/dataset); tablas físicas dinámicas quedan como mejora futura.
- Filtros v1: igualdad + rango de fecha; sin operadores avanzados.
- Visualizaciones entre múltiples datasets: fuera de alcance (cada visualización se liga a un dataset).
- No determinado: exportación de gráficas, multi-idioma y acceso por usuarios de empresa.
