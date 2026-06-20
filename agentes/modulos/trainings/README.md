# Modulo Trainings (Capacitaciones)

## Que hace

Gestiona el plan de capacitaciones en SST y examenes ocupacionales (ARL) de la empresa.
Permite crear capacitaciones con preguntas (abiertas, opcion multiple, si/no), adjuntar
material de estudio (PDF, video, Excel), asignar usuarios, y que estos realicen los examenes
ingresando con su numero de cedula. Genera certificados PDF de aprobacion/no aprobacion.

## Tablas

1. `trainings` — Capacitaciones
2. `questions` — Preguntas asociadas a una capacitacion
3. `question_options` — Opciones de respuesta (para multiple_choice y yes_no)
4. `training_user` — Pivot usuarios asignados a capacitaciones
5. `user_answers` — Respuestas de usuarios a cada pregunta
6. `training_materials` — Archivos adjuntos (polimorfico: training o question)

Migracion adicional:
- `add_document_number_to_users_table` — Campo `document_number` en tabla `users`

## Rutas API (protegidas con menu.access:/trainings)

### Capacitaciones (admin)
- `GET /api/trainings` — Listar
- `POST /api/trainings` — Crear
- `GET /api/trainings/{training}` — Ver detalle (incluye preguntas, opciones, materiales, usuarios)
- `PUT /api/trainings/{training}` — Actualizar
- `DELETE /api/trainings/{training}` — Eliminar
- `POST /api/trainings/{training}/assign` — Asignar usuarios
- `DELETE /api/trainings/{training}/users/{user}` — Remover usuario
- `GET /api/trainings/{training}/users` — Usuarios asignados

### Materiales de capacitacion
- `POST /api/trainings/{training}/materials` — Subir archivo
- `DELETE /api/trainings/{training}/materials/{material}` — Eliminar archivo

### Preguntas
- `GET /api/trainings/{training}/questions` — Listar preguntas de una capacitacion
- `POST /api/trainings/{training}/questions` — Crear pregunta
- `GET /api/questions/{question}` — Ver pregunta
- `PUT /api/questions/{question}` — Actualizar pregunta
- `DELETE /api/questions/{question}` — Eliminar pregunta
- `POST /api/questions/{question}/options` — Crear opcion
- `PUT /api/question-options/{option}` — Actualizar opcion
- `DELETE /api/question-options/{option}` — Eliminar opcion
- `POST /api/questions/{question}/materials` — Subir material a pregunta
- `DELETE /api/questions/{question}/materials/{material}` — Eliminar material de pregunta

### Rutas publicas (acceso por cedula)
- `POST /api/public/trainings/login` — Login con numero de documento
- `GET /api/public/trainings/pending` — Capacitaciones pendientes del usuario
- `GET /api/public/trainings/completed` — Capacitaciones completadas
- `GET /api/public/trainings/{training}/take` — Obtener examen (preguntas + material)
- `POST /api/public/trainings/{training}/submit` — Enviar respuestas
- `GET /api/public/trainings/{training}/result` — Ver resultado
- `GET /api/public/trainings/{training}/certificate` — Descargar certificado PDF

## Frontend (admin)

Rutas bajo `/trainings` protegidas por `authGuard` y `menu.access:/trainings`:
- `/trainings` — Listado de capacitaciones
- `/trainings/create` — Nueva capacitacion
- `/trainings/:id/edit` — Editar capacitacion
- `/trainings/:id/questions` — Gestionar preguntas
- `/trainings/:id/assign` — Asignar usuarios
- `/trainings/:id/results` — Resultados por capacitacion

## Frontend (publico)

Rutas publicas (sin autenticacion del sistema principal):
- `/public/trainings` — Login con numero de cedula
- `/public/trainings/dashboard` — Dashboard con capacitaciones pendientes y completadas
- `/public/trainings/:id/take` — Realizar examen
- `/public/trainings/:id/result` — Ver resultado y descargar certificado

## Flujo de uso

1. Admin crea una capacitacion (`/trainings/create`)
2. Admin agrega preguntas (abiertas, multiple choice, si/no) (`/trainings/:id/questions`)
3. Admin asigna usuarios (`/trainings/:id/assign`)
4. Usuario ingresa con su cedula en `/public/trainings`
5. Usuario ve material de estudio y realiza el examen
6. Sistema califica automaticamente opcion multiple y si/no
7. Usuario ve resultado y descarga certificado PDF

## Certificados

- Generados con dompdf
- Incluyen: nombre, cedula, titulo capacitacion, puntaje, resultado (aprobado/no aprobado)
- Almacenados en `storage/app/public/certificates/`

## Backend relacionado

- `backend/app/Http/Controllers/Api/TrainingController.php`
- `backend/app/Http/Controllers/Api/QuestionController.php`
- `backend/app/Http/Controllers/Api/PublicTrainingController.php`
- `backend/app/Http/Controllers/Api/CertificateController.php`
- `backend/app/Models/Training.php`
- `backend/app/Models/Question.php`
- `backend/app/Models/QuestionOption.php`
- `backend/app/Models/TrainingUser.php`
- `backend/app/Models/UserAnswer.php`
- `backend/app/Models/TrainingMaterial.php`
- `backend/resources/views/certificates/training.blade.php`
- `backend/routes/api.php`
- `backend/database/migrations/2026_06_16_000015_to_2026_06_16_000021`
- `backend/database/seeders/DatabaseSeeder.php`

## Frontend relacionado

- `frontend/src/app/core/services/training.service.ts`
- `frontend/src/app/features/trainings/training-list.component.ts`
- `frontend/src/app/features/trainings/training-form.component.ts`
- `frontend/src/app/features/trainings/training-questions.component.ts`
- `frontend/src/app/features/trainings/training-assign.component.ts`
- `frontend/src/app/features/trainings/training-results.component.ts`
- `frontend/src/app/features/public-trainings/public-login.component.ts`
- `frontend/src/app/features/public-trainings/public-dashboard.component.ts`
- `frontend/src/app/features/public-trainings/public-exam.component.ts`
- `frontend/src/app/features/public-trainings/public-result.component.ts`
- `frontend/src/app/core/interceptors/auth.interceptor.ts` (modificado)
- `frontend/src/app/app.routes.ts` (modificado)

## Estado actual

- [x] Migraciones creadas (7 tablas + 1 alteracion)
- [x] Modelos creados (6 modelos)
- [x] Controladores backend (4 controladores)
- [x] Rutas API configuradas
- [x] Seeders actualizados (item menu capacitaciones)
- [x] Servicio Angular (TrainingService)
- [x] Componentes admin Angular (5 componentes)
- [x] Componentes publicos Angular (4 componentes)
- [x] Interceptor actualizado (soporte token publico)
- [x] Rutas Angular configuradas
- [x] Certificado PDF (vista Blade + dompdf)

## Riesgos

- Si un usuario no tiene `document_number`, no puede acceder al modulo publico.
- Las preguntas abiertas requieren revision manual del admin (no se califican automaticamente).
- El puntaje automatico solo considera preguntas de opcion multiple y si/no.