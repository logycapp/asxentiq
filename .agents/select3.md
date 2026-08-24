# Select3 — mapa de uso

Referencia de dónde y cómo se usa el componente `Select3Component` (`app-select3`) en el frontend.

## Componente

- Archivo: `frontend/src/app/shared/select3.component.ts`
- Selector: `app-select3`
- Tipo: standalone, implementa `ControlValueAccessor` (`NG_VALUE_ACCESSOR`), por lo que funciona con `[(ngModel)]` y con `formControlName`.
- Import del tipo de opciones: `import { Select3Component } from '../../shared/select3.component';`
- Tipo de opciones: `Select3Option = { value: number | string | boolean | null; label: string }` (exportado desde `select3.component.ts`).

### API pública

| Miembro | Tipo | Uso |
|---|---|---|
| `options` | `Select3Option[]` | Opciones del listbox (input setter). |
| `placeholder` | `string` | Texto cuando no hay selección (default "Seleccionar..."). |
| `requiredMessage` | `string` | Mensaje de validación (default "Este campo es obligatorio."). |
| `disabled` | `boolean` | Deshabilita trigger y opciones. |
| `setInvalid(boolean)` | método | Marca el trigger como inválido manualmente. |
| `value` (CVA) | `number \| string \| boolean \| null` | Valor seleccionado vía `[(ngModel)]` o `formControlName`. |

Comportamiento: panel con búsqueda por label (case-insensitive), cierra con click fuera / Escape, el panel se posiciona con `position: fixed` sobre el trigger (recalcula en scroll/resize), y el estado inválido se pinta con `:host(.ng-invalid.ng-touched)` y `is-invalid`.

## Mapa de uso

### Features / users

`frontend/src/app/features/users/user-list.component.ts` + `.html`

- Modal crear usuario:
  - Empresa `createEmpresaId` — `[options]="empresaOptions"` (value: `number`), `[disabled]="empresaId !== null || empresaOptions.length === 0"`, `required`.
  - Rol `createRole` — `[options]="roleOptions"` (value: `string` slug), `[disabled]="roleOptions.length === 0"`, `required`.
- Modal editar usuario:
  - Rol `editRole` — `[options]="roleOptions"`.
  - Empresa `editEmpresaId` — `[options]="empresaOptions"`.
- Patrón de validación: `#xModel="ngModel"` + `required` + `<div class="invalid-feedback d-block" *ngIf="(xModel.touched || form.submitted) && xModel.invalid">`.
- Si `isEmpresaScopedUser` se reemplaza por `<ng-template #createEmpresaReadonly>` con `scopedEmpresaLabel` (div readonly), no se renderiza select3.
- Fuente de opciones: `empresaOptions` (desde `EmpresaService`), `roleOptions` (desde `RoleService`).

> Nota: `/users/:id/edit` usa `user-form.component.html`, que NO usa select3: ahí los selects de Empresa y Rol son `<select class="form-select">` nativos con `[ngValue]`/`[value]`.

### Features / trainings

`frontend/src/app/features/trainings/training-form.component.ts` (template inline) — formulario crear/editar capacitación:

- Programa `model.training_category_id` — `[options]="categoryOptions"` (value: `number`), `[disabled]="categories.length === 0"`, `required`.
- Estado `model.status` — `[options]="statusOptions"`, `required`.
- Modalidad `model.modality` — `[options]="modalityOptions"`, `required`.
- Obligatoria `model.mandatory` — `[options]="booleanOptions"`.
- Material con indexación — `[options]="booleanOptions"`.
- Tipo de material `trainingMaterialTypeOptions` (value: `string`).

`frontend/src/app/features/trainings/training-list.component.html` — modal editar capacitación:

- Programa `editTrainingCategoryId`, Estado `editStatus`, Modalidad `editModality`, Obligatoria `editMandatory`, Material con indexación `editMaterialWithIndexation` (con `(ngModelChange)="onMaterialWithIndexationChange($event)"`), Tipo `trainingMaterialType` (con `(ngModelChange)="onTrainingMaterialTypeChange($event)"`).

`frontend/src/app/features/trainings/training-category-form.component.ts` (template inline) — formulario programa:

- Empresa `formControlName="empresa_id"` — `[options]="empresaOptions"`, `required`. Es el único caso con `formControlName` en lugar de `ngModel`.
- `ng-template #empresaReadonly` para `isEmpresaScopedUser`.

`frontend/src/app/features/trainings/training-category-list.component.ts` (template inline) — modal crear/editar programa:

- Empresa `createEmpresaId` — `[options]="empresaOptions"`, `required`.

`frontend/src/app/features/trainings/participant-form.component.ts` (template inline) — formulario participante:

- Empresa `form.empresa_id` vía `[(ngModel)]` + `name="empresa_id"` — `#empresaModel="ngModel"`, `required`.
- `ng-template #empresaReadonly` para `isEmpresaScopedUser`.

`frontend/src/app/features/trainings/participant-list.component.html` — filtros y modales:

- Filtro Empresa `empresaFilterId` — `[options]="empresaFilterOptions"` (incluye opción `{ value: null, label: 'Todas las empresas' }`), `(ngModelChange)="onEmpresaFilterChange($event)"`.
- Filtro Estado de empresa `empresaStateFilter` — `[options]="empresaStateOptions"` (value: `'all' | 'active' | 'inactive'`), `(ngModelChange)="onEmpresaStateFilterChange($event)"`.
- Modal crear `createEmpresaId` y modal editar `editEmpresaId` — `[options]="empresaOptions"`, `required`.

## Fuentes de opciones (patrones comunes)

- Listas fijas: `statusOptions`, `modalityOptions`, `booleanOptions`, `materialTypeOptions`, `empresaStateOptions` — arrays literales `{ value, label }` en el componente.
- Derivadas de servicios: `empresaOptions` / `categoryOptions` / `roleOptions` — `.map()` sobre listas de `EmpresaService` / `TrainingService` / `RoleService`.
- Incluir opción "todos": anteponer `{ value: null, label: 'Todas…' }` a las opciones derivadas (ej. `empresaFilterOptions`).

## Reglas / gotchas

- Usar select3 para selects con búsqueda o listas largas; los selects cortos pueden seguir usando `<select class="form-select">` nativo (ver `user-form`, `powerbi-project-list`, `powerbi-project-detail`).
- El panel usa `position: fixed`; no funciona dentro de contenedores con `overflow: hidden` sin ajuste (soporta scroll/resize del window).
- Con `formControlName` el estado inválido sale de `:host(.ng-invalid.ng-touched)`; con `ngModel` hay que validar contra el modelo `#xModel` + `form.submitted`.
- El modo claro está soportado vía `:host-context(.light)` (los colores oscuros son el default del componente).
- Para usuarios con rol `empresa`, los selects de Empresa se sustituyen por `scopedEmpresaLabel` readonly — patrón `isEmpresaScopedUser` + `ng-template #...Readonly` replicado en users y trainings.
