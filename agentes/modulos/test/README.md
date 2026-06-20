# Modulo Test

## Que hace

Expone un formulario de prueba con subida de archivo para validar integracion frontend-backend.

## Como opera

- El frontend arma un `FormData` con `dato1`, `dato2` y `adjunto`.
- El backend valida los campos y devuelve metadatos del archivo.
- No se observa persistencia en base de datos en este flujo.

## Flujo operativo

1. El usuario completa el formulario de prueba.
2. Selecciona un archivo.
3. El frontend envía `POST /api/test`.
4. El backend valida y responde con nombre, tipo MIME y tamano.

## Backend relacionado

- `backend/app/Http/Controllers/Api/TestController.php`
- `backend/routes/api.php`

## Frontend relacionado

- `frontend/src/app/features/test/test-form.component.ts`
- `frontend/src/app/core/services/test.service.ts`

## Endpoints

- `POST /api/test`

## Reglas importantes

- `dato1` y `dato2` son obligatorios.
- `adjunto` es obligatorio.
- El archivo tiene un maximo de 10 MB.

## Estado actual

- Implementado como prueba funcional.

## Riesgos

- Si se cambia el formato de respuesta, el componente de prueba puede dejar de mostrar el resumen correcto.
- No determinado: destino final del archivo.
