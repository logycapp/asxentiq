<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\TestController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me/menu-permissions', [AuthController::class, 'menuPermissions']);
});
Route::post('/forgot-password', [AuthController::class, 'sendPasswordResetLink']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/storage/{path}', [StorageController::class, 'show'])->where('path', '.*');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/menu', [MenuController::class, 'index']);
    Route::post('/test', [TestController::class, 'store']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar/generate', [ProfileController::class, 'generateAvatar']);

    Route::middleware('menu.access:/roles')->group(function (): void {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{role}', [RoleController::class, 'show']);
        Route::put('/roles/{role}', [RoleController::class, 'update']);
        Route::get('/roles/{role}/menu-permissions', [RoleController::class, 'menuPermissions']);
        Route::put('/roles/{role}/menu-permissions', [RoleController::class, 'updateMenuPermissions']);
        Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    });

    Route::middleware('menu.access:/users')->group(function (): void {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::get('/users/{user}/menu-permissions', [UserController::class, 'menuPermissions']);
        Route::put('/users/{user}/menu-permissions', [UserController::class, 'updateMenuPermissions']);
        Route::patch('/users/{user}/activate', [UserController::class, 'activate']);
        Route::patch('/users/{user}/deactivate', [UserController::class, 'deactivate']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

    Route::middleware('menu.access:/trainings')->group(function (): void {
        // Trainings CRUD
        Route::get('/trainings', [TrainingController::class, 'index']);
        Route::post('/trainings', [TrainingController::class, 'store']);
        Route::get('/trainings/{training}', [TrainingController::class, 'show']);
        Route::put('/trainings/{training}', [TrainingController::class, 'update']);
        Route::delete('/trainings/{training}', [TrainingController::class, 'destroy']);

        // Training users assignment
        Route::get('/trainings/{training}/users', [TrainingController::class, 'users']);
        Route::post('/trainings/{training}/assign', [TrainingController::class, 'assignUsers']);
        Route::delete('/trainings/{training}/users/{user}', [TrainingController::class, 'removeUser']);

        // Training participants assignment
        Route::get('/trainings/{training}/participants', [TrainingController::class, 'participants']);
        Route::post('/trainings/{training}/assign-participants', [TrainingController::class, 'assignParticipants']);
        Route::delete('/trainings/{training}/participants/{participant}', [TrainingController::class, 'removeParticipant']);
        Route::get('/trainings/{training}/participants/{participant}/review', [TrainingController::class, 'participantReview']);
        Route::put('/trainings/{training}/participants/{participant}/review', [TrainingController::class, 'updateParticipantReview']);
        Route::post('/trainings/{training}/participants/{participant}/reset', [TrainingController::class, 'resetParticipantAttempt']);

        // Training materials
        Route::post('/trainings/{training}/materials', [TrainingController::class, 'uploadMaterial']);
        Route::delete('/trainings/{training}/materials/{material}', [TrainingController::class, 'deleteMaterial']);

        // Questions nested under trainings (must be before /questions/{question})
        Route::get('/trainings/{training}/questions', [QuestionController::class, 'index']);
        Route::post('/trainings/{training}/questions', [QuestionController::class, 'store']);

        // Questions CRUD
        Route::get('/questions/{question}', [QuestionController::class, 'show']);
        Route::put('/questions/{question}', [QuestionController::class, 'update']);
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

        // Question options
        Route::post('/questions/{question}/options', [QuestionController::class, 'storeOption']);
        Route::put('/question-options/{option}', [QuestionController::class, 'updateOption']);
        Route::delete('/question-options/{option}', [QuestionController::class, 'destroyOption']);

        // Question materials
        Route::post('/questions/{question}/materials', [QuestionController::class, 'uploadMaterial']);
        Route::delete('/questions/{question}/materials/{material}', [QuestionController::class, 'deleteMaterial']);
    });

    // Participants CRUD
    Route::middleware('menu.access:/trainings')->group(function (): void {
        Route::get('/participants', [ParticipantController::class, 'index']);
        Route::get('/participants/export', [ParticipantController::class, 'export']);
        Route::post('/participants/import', [ParticipantController::class, 'import']);
        Route::post('/participants', [ParticipantController::class, 'store']);
        Route::get('/participants/{trainingParticipant}', [ParticipantController::class, 'show']);
        Route::put('/participants/{trainingParticipant}', [ParticipantController::class, 'update']);
        Route::delete('/participants/{trainingParticipant}', [ParticipantController::class, 'destroy']);
    });

});

// Public training routes (no auth:sanctum - uses participant token in Authorization header)
Route::post('/public/trainings/login', [\App\Http\Controllers\Api\PublicTrainingController::class, 'login']);
Route::middleware('auth.participant')->group(function (): void {
    Route::get('/public/trainings/pending', [\App\Http\Controllers\Api\PublicTrainingController::class, 'pending']);
    Route::get('/public/trainings/completed', [\App\Http\Controllers\Api\PublicTrainingController::class, 'completed']);
    Route::get('/public/trainings/{training}/take', [\App\Http\Controllers\Api\PublicTrainingController::class, 'take']);
    Route::post('/public/trainings/{training}/submit', [\App\Http\Controllers\Api\PublicTrainingController::class, 'submit']);
    Route::get('/public/trainings/{training}/result', [\App\Http\Controllers\Api\PublicTrainingController::class, 'result']);
    Route::get('/public/trainings/{training}/certificate', [\App\Http\Controllers\Api\CertificateController::class, 'download']);
});
