# AGENTS.md

Este archivo es la autoridad de reglas para Codex en este proyecto.

## Orden de lectura

1. Leer este archivo primero.
2. Leer `MAPA_PROYECTO.md`.
3. Identificar si la tarea es de `backend`, `frontend` o de un `modulo`.
4. Leer el documento operativo correspondiente:
   - `agentes/backend.md`
   - `agentes/frontend.md`
   - `agentes/modulos/{modulo}/README.md`

## Regla de alcance

- No analizar todo el proyecto salvo que el usuario lo pida de forma explicita.
- Revisar solo los archivos relacionados con la tarea actual.
- No revisar `vendor`, `node_modules`, `storage`, `bootstrap/cache`, `dist`, `.angular` ni `.git`.

## Regla de cambios

- Antes de modificar cualquier archivo, decir que archivos se tocaran y por que.
- Hacer cambios minimos.
- No cambiar codigo funcional salvo que el usuario lo pida de forma explicita.
- No inventar funcionalidades ni asumir comportamiento no verificado.
- Si algo no se puede determinar, escribir `No determinado`.

## Regla de documentacion

- Las tareas de documentacion deben mantenerse en archivos `.md`.
- Si la tarea afecta backend, frontend o un modulo, documentar el flujo operativo solo de la parte implicada.
- Si hay duda sobre el area afectada, pedir una aclaracion antes de ampliar el alcance.
