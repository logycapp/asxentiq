<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CertificateController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PowerbiController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PublicPowerbiController;
use App\Http\Controllers\Api\PublicTrainingController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\TestController;
use App\Http\Controllers\Api\ThemeController;
use App\Http\Controllers\Api\TrainingCategoryController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VideoIndexActionController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me/menu-permissions', [AuthController::class, 'menuPermissions']);
});
Route::post('/forgot-password', [AuthController::class, 'sendPasswordResetLink']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/storage/{path}', [StorageController::class, 'show'])->where('path', '.*');
Route::get('/empresas/token/{token}', [EmpresaController::class, 'showByToken']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/privacy-consent', [AuthController::class, 'acceptPrivacyConsent']);
    Route::get('/time', function (): JsonResponse {
        $serverNow = now(config('app.timezone'));

        return response()->json([
            'server_time' => $serverNow->toIso8601String(),
            'timezone' => config('app.timezone'),
            'timezone_abbr' => $serverNow->format('T'),
        ]);
    });
    Route::get('/menu', [MenuController::class, 'index']);
    Route::post('/test', [TestController::class, 'store']);
    Route::post('/test/extract-audio', [TestController::class, 'extractAudio']);
    Route::post('/test/analyze-audio', [TestController::class, 'analyzeAudio']);
    Route::get('/video-indexaction/trainings/{training}/indexation', [VideoIndexActionController::class, 'showIndexation']);
    Route::post('/video-indexaction/extract-audio', [VideoIndexActionController::class, 'extractAudio']);
    Route::post('/video-indexaction/trainings/{training}/analyze-audio', [VideoIndexActionController::class, 'analyzeAudio']);
    Route::get('/video-indexaction/trainings/{training}/question-assignments', [VideoIndexActionController::class, 'indexationQuestions']);
    Route::put('/video-indexaction/trainings/{training}/question-assignments/{themeOrder}', [VideoIndexActionController::class, 'updateIndexationQuestions']);
    Route::delete('/video-indexaction/trainings/{training}/indexation', [VideoIndexActionController::class, 'clearIndexation']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar/generate', [ProfileController::class, 'generateAvatar']);
    Route::post('/theme', [ThemeController::class, 'update']);
    Route::get('/dashboard/trainings/stats', [TrainingController::class, 'dashboardStats']);

    Route::middleware('menu.access:/roles')->group(function (): void {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{role}', [RoleController::class, 'show']);
        Route::put('/roles/{role}', [RoleController::class, 'update']);
        Route::get('/roles/{role}/menu-permissions', [RoleController::class, 'menuPermissions']);
        Route::put('/roles/{role}/menu-permissions', [RoleController::class, 'updateMenuPermissions']);
        Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    });

    Route::middleware('menu.access:/empresas')->group(function (): void {
        Route::get('/empresas', [EmpresaController::class, 'index']);
        Route::post('/empresas', [EmpresaController::class, 'store']);
        Route::get('/empresas/{empresa}', [EmpresaController::class, 'show']);
        Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);
        Route::patch('/empresas/{empresa}/activate', [EmpresaController::class, 'activate']);
        Route::patch('/empresas/{empresa}/deactivate', [EmpresaController::class, 'deactivate']);
        Route::delete('/empresas/{empresa}', [EmpresaController::class, 'destroy']);
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
        // Training categories
        Route::get('/trainings/categories', [TrainingCategoryController::class, 'index']);
        Route::post('/trainings/categories', [TrainingCategoryController::class, 'store']);
        Route::get('/trainings/categories/{category}', [TrainingCategoryController::class, 'show']);
        Route::put('/trainings/categories/{category}', [TrainingCategoryController::class, 'update']);
        Route::delete('/trainings/categories/{category}', [TrainingCategoryController::class, 'destroy']);

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

        // Training participants
        Route::get('/trainings/{training}/participants', [TrainingController::class, 'participants']);
        Route::get('/trainings/{training}/participants/export', [TrainingController::class, 'downloadParticipantsReport']);
        Route::get('/trainings/{training}/participants/report', [TrainingController::class, 'downloadTrainingParticipantsReport']);
        Route::get('/trainings/{training}/participants/report-detailed', [TrainingController::class, 'downloadTrainingParticipantsAnswersReport']);
        Route::post('/trainings/{training}/participants/import', [TrainingController::class, 'importParticipantsReport']);
        Route::post('/trainings/{training}/participants', [TrainingController::class, 'storeParticipant']);
        Route::put('/trainings/{training}/participants/{participant}', [TrainingController::class, 'updateParticipant']);
        Route::patch('/trainings/{training}/participants/{participant}/activate', [TrainingController::class, 'activateParticipant']);
        Route::patch('/trainings/{training}/participants/{participant}/deactivate', [TrainingController::class, 'deactivateParticipant']);
        Route::delete('/trainings/{training}/participants/{participant}', [TrainingController::class, 'destroyParticipant']);
        Route::get('/trainings/{training}/participants/{participant}/review', [TrainingController::class, 'participantReview']);
        Route::put('/trainings/{training}/participants/{participant}/review', [TrainingController::class, 'updateParticipantReview']);
        Route::post('/trainings/{training}/participants/{participant}/reset', [TrainingController::class, 'resetParticipantAttempt']);

        // Training materials
        Route::post('/trainings/{training}/materials', [TrainingController::class, 'uploadMaterial']);
        Route::delete('/trainings/{training}/materials/{material}', [TrainingController::class, 'deleteMaterial']);

        // Questions nested under trainings (must be before /questions/{question})
        Route::get('/trainings/{training}/questions', [QuestionController::class, 'index']);
        Route::get('/trainings/{training}/questions/template', [QuestionController::class, 'downloadTemplate']);
        Route::post('/trainings/{training}/questions/import', [QuestionController::class, 'importTemplate']);
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

    Route::middleware('menu.access:/powerbi')->group(function (): void {
        Route::get('/powerbi/transformers', [PowerbiController::class, 'transformers']);
        Route::get('/powerbi/projects', [PowerbiController::class, 'index']);
        Route::post('/powerbi/projects', [PowerbiController::class, 'store']);
        Route::get('/powerbi/projects/{project}', [PowerbiController::class, 'show']);
        Route::put('/powerbi/projects/{project}', [PowerbiController::class, 'update']);
        Route::delete('/powerbi/projects/{project}', [PowerbiController::class, 'destroy']);
        Route::post('/powerbi/projects/{project}/publish', [PowerbiController::class, 'publish']);
        Route::post('/powerbi/projects/{project}/unpublish', [PowerbiController::class, 'unpublish']);
        Route::post('/powerbi/projects/{project}/regenerate-token', [PowerbiController::class, 'regenerateToken']);
        Route::post('/powerbi/projects/{project}/datasets/preview', [PowerbiController::class, 'previewDataset']);
        Route::post('/powerbi/projects/{project}/datasets', [PowerbiController::class, 'importDataset']);
        Route::get('/powerbi/projects/{project}/datasets', [PowerbiController::class, 'datasets']);
        Route::delete('/powerbi/datasets/{dataset}', [PowerbiController::class, 'destroyDataset']);
        Route::get('/powerbi/projects/{project}/visualizations', [PowerbiController::class, 'visualizations']);
        Route::post('/powerbi/projects/{project}/visualizations', [PowerbiController::class, 'storeVisualization']);
        Route::put('/powerbi/visualizations/{visualization}', [PowerbiController::class, 'updateVisualization']);
        Route::delete('/powerbi/visualizations/{visualization}', [PowerbiController::class, 'destroyVisualization']);
        Route::get('/powerbi/projects/{project}/dashboard', [PowerbiController::class, 'dashboard']);
    });

});

Route::get('/public/powerbi/{token}', [PublicPowerbiController::class, 'show']);

// Public training routes (no auth:sanctum - uses participant token in Authorization header)
Route::post('/public/trainings/login', [PublicTrainingController::class, 'login']);
Route::middleware('auth.participant')->group(function (): void {
    Route::post('/public/trainings/privacy-consent', [PublicTrainingController::class, 'acceptPrivacyConsent']);
    Route::get('/public/trainings/pending', [PublicTrainingController::class, 'pending']);
    Route::get('/public/trainings/completed', [PublicTrainingController::class, 'completed']);
    Route::post('/public/trainings/{training}/begin', [PublicTrainingController::class, 'begin']);
    Route::get('/public/trainings/{training}/take', [PublicTrainingController::class, 'take']);
    Route::post('/public/trainings/{training}/submit', [PublicTrainingController::class, 'submit']);
    Route::get('/public/trainings/{training}/result', [PublicTrainingController::class, 'result']);
    Route::get('/public/trainings/{training}/certificate', [CertificateController::class, 'download']);
});
