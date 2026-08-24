# Evolución /powerbi → Proyectos de visualización con CSV y URL pública

## Contexto

El módulo `/powerbi` actual importa un Excel de esquema fijo ("siniestros graves") a `powerbi_datas` y renderiza un dashboard fijo. Se evoluciona a un sistema de **proyectos** (asociados a una empresa), cada proyecto con **datasets** (archivos CSV, esquema dinámico por carga) y **visualizaciones configuradas y persistidas**, con **URL pública** para compartir el resultado final.

## Decisiones confirmadas

1. Evolucionar el módulo `/powerbi` existente (no crear módulo paralelo).
2. Persistencia: `powerbi_projects` + `powerbi_datasets` (esquema JSON por carga) + `powerbi_rows` (fila completa en JSON). Sin DDL dinámico. Filtros/agregación en PHP.
3. Visualizaciones configurables y persistidas (el usuario elige dataset, tipo de gráfica, columna etiqueta/valor, agregación).
4. Formato de archivos: **solo CSV**. Un archivo CSV = un dataset.
5. URL pública: estado `published`/`draft` + `public_token` (UUID). Ruta pública `/public/powerbi/:token`, solo lectura, sin filtros, modo claro. Al despublicar se revoca.
6. Migración: los registros actuales de `powerbi_datas` se migran a un proyecto por defecto "Siniestros Graves" (con su dataset y visualizaciones iniciales que replican el dashboard actual).
7. Dashboard autenticado del proyecto: **tabs por dataset** + barra de filtros global derivada de las columnas del dataset activo (rangos de fecha + columnas texto de baja cardinalidad). La vista pública también usa tabs por dataset, sin filtros.
8. Gestión: solo rol admin (se conserva `menu.access:/powerbi`). El proyecto se asocia a una empresa vía select.
9. Código personalizado por proyecto: **solo clase PHP por proyecto** (sin reglas configurables). Directorio `backend/app/PowerbiTransformers/`, registro en `config/powerbi.php`, referencia desde `powerbi_projects.handler` (string nullable). El parseo genérico corre primero y la clase post-procesa columnas/filas. Whitelist por registro; nunca instanciar clases desde input del usuario.
10. Normalización de CSV: conversión a UTF-8 (BOM UTF-8/UTF-16, Windows-1252/latin1), parseo con comillas respetadas, saneamiento de caracteres (`ñ`/acentos correctos, caracteres de control, forma Unicode NFC).

## Modelo de datos (migraciones nuevas)

### 1. `create_powerbi_projects_table`
- `id`, `empresa_id` (FK → `empresas.id`, onDelete cascade), `name` (string), `description` (text, nullable)
- `status` (string: `draft` | `published`, default `draft`), `public_token` (string 36, unique, nullable)
- `handler` (string, nullable) — clave del transformer por proyecto en `config/powerbi.php`; `null` = solo parseo genérico
- `timestamps`

### 2. `create_powerbi_datasets_table`
- `id`, `project_id` (FK → `powerbi_projects.id`, cascade), `source_file` (string), `row_count` (unsignedInteger)
- `columns` (json: `[{key, label, type}]`, type en `string|numeric|date`)
- `delimiter` (string, nullable), `encoding` (string, nullable), `imported_at` (timestamp), `timestamps`

### 3. `create_powerbi_rows_table`
- `id`, `dataset_id` (FK → `powerbi_datasets.id`, cascade), `source_row_number` (unsignedInteger)
- `data` (json, llaveado por column `key`), `timestamps`, índice `dataset_id`

### 4. `create_powerbi_visualizations_table`
- `id`, `project_id` (FK cascade), `dataset_id` (FK nullable, cascade), `title` (string)
- `chart_type` (string: `bar|line|area|pie|kpi|table`)
- `config` (json): `{label_column, value_column, aggregation: count|sum|avg|min|max, date_grouping: null|day|month|year}`
- `sort_order` (unsignedInteger default 0), `timestamps`

### 5. Migración de datos (`migrate_powerbi_datas_to_projects`)
- Crear proyecto `Siniestros Graves` ligado a la primera empresa activa (o primera empresa), status `draft`.
- Crear dataset con las columnas del esquema fijo actual y copiar cada fila de `powerbi_datas` a `powerbi_rows` (mapeando las columnas existentes al `data` JSON).
- Sembrar visualizaciones que replican el dashboard actual: tendencia mensual (`fecha_siniestro` con `date_grouping=month`), barras por causal/departamento/mecanismo/diagnóstico, KPI "Total registros".
- Hacer `dropIfExists('powerbi_datas')`. Eliminar modelo `PowerbiData` y el seeder `PowerbiDataSeeder` (obsoleto: importa xlsx). Quitar su llamada en `DatabaseSeeder`.

## Backend

### Modelos
- `PowerbiProject`, `PowerbiDataset`, `PowerbiRow`, `PowerbiVisualization` (patrón de `Empresa.php`/`PowerbiData.php`: `$fillable`, casts para `columns`/`data`/`config` como `array`). Relaciones: project→empresa/datasets/visualizations, dataset→project/rows, visualization→project/dataset.

### Servicios (reemplazan `PowerbiWorkbookService`, que se elimina)
- `PowerbiCsvService`: pipeline de normalización y parseo:
  1. **Encoding → UTF-8**: detectar BOM (UTF-8 `EF BB BF`, UTF-16 LE `FF FE`, UTF-16 BE `FE FF`); si no hay BOM, `mb_detect_encoding($content, ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ASCII'], true)` y convertir con `mb_convert_encoding`; quitar BOM residual. El encoding detectado se guarda en `powerbi_datasets.encoding`.
  2. **Delimitador con soporte de comillas**: puntuar candidatos (`,` `;` `\t` `|`) contando ocurrencias en las primeras líneas **fuera de secciones entre comillas** (estado de quote manual o prueba con `str_getcsv`). Se guarda en `powerbi_datasets.delimiter`.
  3. **Parseo de filas**: `fgetcsv($stream, 0, $delimiter, '"')` para respetar comas/newlines dentro de valores citados y comillas escapadas `""`.
  4. **Saneamiento por celda (`normalizeValue`)**: quitar null bytes y caracteres de control, `trim`, normalizar a NFC (`Normalizer::FORM_C`) para unificar `ñ`/acentos compuestos, vacío → `null`, numéricos/bool normalizados (reutilizar `normalizeValue` actual).
  5. **Headers**: primera fila como labels sanitizados (trim, fallback `Columna N`, dedupe con sufijo — lógica de `buildColumns` actual), ahora con `ñ`/acentos correctos.
  6. **Clasificación de tipos**: `string|numeric|date` (reutilizar `classifyColumns` + detección de fecha con Carbon, formatos comunes `dd/mm/yyyy` y `yyyy-mm-dd`).
  - Devuelve `columns` + filas normalizadas llaveadas por `key` + preview (primeras 20 filas). Dependencias PHP requeridas: `ext-mbstring` y `ext-intl` (Normalizer).
- `PowerbiAnalyticsService`: dado dataset + config de visualización + filtros → calcular puntos: agrupar por `label_column` (con `date_grouping` si la columna es fecha), agregar `value_column` con la agregación (count si no hay value_column), ordenar. También calcular opciones de filtro (valores distintos de columnas texto baja cardinalidad, min/max de columnas fecha) y KPIs.
- `PowerbiProjectService`: CRUD de proyectos, publish/unpublish/regenerate-token, orquestación de import (parse → resolver transformer → crear dataset → insertar filas en transacción), cálculo de dashboard por dataset con filtros, resolución pública por token.

### Transformers por proyecto (código personalizado)
- Contrato `PowerbiTransformerContract` (en `backend/app/Contracts/`): `transformColumns(array $columns): array` y `transformRow(array $row): array`; base abstracta `AbstractPowerbiTransformer` con defaults (no-op).
- Registro en `config/powerbi.php` → `'transformers' => ['clave' => \App\PowerbiTransformers\Clase::class, ...]`. La validación de `handler` acepta solo claves existentes en el registro (whitelist); nunca se instancia una clase desde input del usuario.
- Pipeline de import: parseo genérico (`PowerbiCsvService`) → si el proyecto tiene `handler`: `transformColumns` + `transformRow` por fila → dataset con columnas transformadas + filas transformadas. La transformación se aplica **en import**; si la lógica de la clase cambia, se requiere re-importar.
- Ejemplo de referencia: `SiniestrosGravesTransformer` (documenta el esquema fijo migrado; opcional — el proyecto migrado queda con `handler = null`).

### Controladores
- `PowerbiController` (extender): endpoints de proyectos, datasets, visualizaciones y dashboard.
- `PublicPowerbiController` (nuevo): `show(token)` → 404 si no existe, 404/403 si `status !== published`. Devuelve proyecto, empresa, y por dataset sus visualizaciones ya agregadas (sin filtros).

### Rutas (`backend/routes/api.php`)
Reemplazar el bloque `menu.access:/powerbi` actual:
- `GET /powerbi/transformers` (lista whitelist para el select del form)
- `GET/POST /powerbi/projects`, `GET/PUT/DELETE /powerbi/projects/{project}`
- `POST /powerbi/projects/{project}/publish|unpublish|regenerate-token`
- `POST /powerbi/projects/{project}/datasets/preview`
- `POST /powerbi/projects/{project}/datasets` (import CSV), `GET /powerbi/projects/{project}/datasets`, `DELETE /powerbi/datasets/{dataset}`
- `GET/POST /powerbi/projects/{project}/visualizations`, `PUT/DELETE /powerbi/visualizations/{visualization}`
- `GET /powerbi/projects/{project}/dashboard` (query: `dataset_id`, filtros)

Fuera de auth (junto a `/empresas/token/{token}`):
- `GET /public/powerbi/{token}` → `PublicPowerbiController@show`

Validaciones: CSV con `mimes:csv,txt` o extensión csv, máx 20MB (consistente con lo actual).

## Frontend

### Rutas (`frontend/src/app/app.routes.ts`)
Dentro del layout autenticado (mantener `pageTitle`):
- `powerbi` → `PowerbiProjectListComponent`
- `powerbi/create` y `powerbi/:id/edit` → mismo list component (modal dirigida por ruta, patrón de `empresas`)
- `powerbi/:id` → `PowerbiProjectDetailComponent`

Ruta pública sin guard (junto a `public/trainings`):
- `public/powerbi/:token` → `PublicPowerbiComponent`

### Servicio (`powerbi.service.ts`)
- Nuevas interfaces: `PowerbiProject`, `PowerbiDataset`, `PowerbiVisualization`, `PowerbiDashboardResponse`, `PowerbiPreviewResponse` (genérica), `PowerbiFilterOptions`.
- Métodos: listTransformers, CRUD proyectos, publish/unpublish/regenerate-token, previewCsv/importDataset (FormData), deleteDataset, CRUD visualizaciones, getDashboard(project, datasetId, filters), getPublicDashboard(token).
- Conservar los métodos actuales solo si se reutilizan; eliminar `dashboard/preview/import` viejos.

### Componentes (en `features/powerbi/`)
- `powerbi-project-list.component.*`: lista de proyectos (cards/tabla) con empresa, nº de datasets/visualizaciones, badge de estado, botón de link público (copiar). Modal dirigida por ruta para crear/editar (replicar patrón de `empresa-list.component.ts`: `syncModalWithRoute`, FormBuilder, ModalShellComponent, SwalAlertComponent, PageHeaderComponent). Campos: `empresa_id` como select de `EmpresaService.list()` y `handler` como select de transformers disponibles (endpoint `GET /powerbi/transformers`) con opción "Ninguno".
- `powerbi-project-detail.component.*`: cabecera (nombre, estado, controles publicar/despublicar, link público + copiar + regenerar token) y **tabs**:
  - **Datos**: lista de datasets (archivo, row_count, chips de columnas con tipo), subida de CSV (seleccionar → preview con columnas/tipos/muestra → confirmar import), eliminar dataset.
  - **Visualizaciones**: tabs de dataset + barra de filtros derivada de las columnas del dataset activo; grilla de visualizaciones guardadas renderizadas con Highcharts; modal crear/editar (dataset, título, chart_type, label_column, value_column, aggregation, date_grouping).
  - **Compartir**: toggle publicar/despublicar, URL pública + copiar, regenerar token.
- `public-powerbi.component.*`: shell en modo claro (patrón light de `public-trainings`), nombre del proyecto y empresa, tabs por dataset, grilla de visualizaciones en solo lectura con Highcharts, sin filtros.
- Extraer la lógica Highcharts de `powerbi.component.ts` (paletas por tema claro/oscuro, render por `chart_type`, KPI como valor, `table` como tabla HTML) a un helper/componente reutilizable. Nota: el modo oscuro está deshabilitado por constraint del proyecto; las paletas claras son las de referencia.
- Eliminar `powerbi.component.{ts,html,css}` (reemplazado por list/detail/public). `layout.component.ts:219` ya mapea `/powerbi` → icono; no requiere cambio.

## Pasos de implementación (orden)

1. Migraciones nuevas + migración de datos + drop de `powerbi_datas`; eliminar `PowerbiData` y `PowerbiDataSeeder`.
2. Modelos `PowerbiProject`, `PowerbiDataset`, `PowerbiRow`, `PowerbiVisualization`.
3. Servicios: `PowerbiCsvService` (con pipeline de normalización), `PowerbiAnalyticsService`, `PowerbiProjectService`; contrato/base de transformers + registro `config/powerbi.php`; eliminar `PowerbiWorkbookService`.
4. Endpoints en `PowerbiController` (incluye `GET /powerbi/transformers`) + `PublicPowerbiController`; actualizar `routes/api.php`.
5. `powerbi.service.ts` (interfaces + métodos nuevos).
6. Componentes list/detail/public; eliminar el componente viejo.
7. Rutas frontend (`app.routes.ts`).
8. Documentación: actualizar `agentes/modulos/powerbi/README.md` y `MAPA_PROYECTO.md` al nuevo flujo (regla de documentación de `AGENTS.md`).

## Validación

- Backend: `php artisan migrate` (verificar tablas y filas migradas del proyecto "Siniestros Graves"); probar con curl: login → CRUD proyecto → preview/import CSV → visualizaciones → dashboard con filtros → publish → `GET /public/powerbi/{token}` (funciona sin token, y devuelve 404/403 al despublicar). Casos de normalización: CSV con `ñ`/acentos, valores citados con comas, encoding latin-1/Windows-1252 sin BOM, BOM UTF-8, delimitador `;`, filas con comillas escapadas.
- Frontend: `ng build`/lint; flujo manual: crear proyecto con empresa (y `handler` opcional) → subir CSV → crear visualizaciones (bar, pie, KPI, table) → filtrar → publicar → abrir URL pública en incógnito (modo claro, solo lectura).

## Riesgos y fuera de alcance

- Agregación en PHP sobre filas JSON: adecuado para volumen moderado (<100k filas/dataset). Tablas físicas dinámicas quedan como mejora futura.
- Transformers: solo clases whitelisteadas en `config/powerbi.php`; nunca instanciar desde input del usuario. Si cambia la lógica de una clase, se requiere re-importar el dataset. Dependencias PHP: `ext-mbstring` y `ext-intl` (Normalizer).
- Filtros v1: igualdad + rango de fecha; sin operadores avanzados.
- Visualizaciones entre múltiples datasets: fuera de alcance (cada visualización se liga a un dataset).
- Sin exportación de gráficas ni multi-idioma.
- Usuarios de empresa accediendo a proyectos: fuera de alcance (solo admin gestiona; el público ve solo la URL publicada).
- `public_token` regenerado invalida la URL anterior; no se conservan URLs históricas.
