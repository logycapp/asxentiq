# Modulo Dashboard

## Que hace

Muestra una pantalla de inicio dentro del area autenticada.

## Como opera

- Es una vista Angular sin consulta directa a backend en el estado actual.
- Toma el nombre del usuario desde `AuthService`.
- Presenta tarjetas y pasos de estado como contenido de bienvenida.

## Flujo operativo

1. El usuario entra a `/dashboard`.
2. El layout carga la pagina.
3. El componente renderiza informacion visual local.

## Backend relacionado

- No determinado

## Frontend relacionado

- `frontend/src/app/features/dashboard/dashboard.component.ts`
- `frontend/src/app/features/layout/layout.component.ts`
- `frontend/src/app/core/services/auth.service.ts`

## Endpoints

- No determinado

## Reglas importantes

- La pantalla depende de sesion activa.
- No parece tener logica de negocio propia.

## Estado actual

- Implementado como pagina de entrada visual.

## Riesgos

- Puede volverse inconsistente si el contenido fijo se toma como dato real del sistema.
- No determinado: si luego consumira indicadores reales.
