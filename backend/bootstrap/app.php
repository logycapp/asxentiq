<?php

use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
            'auth.participant' => \App\Http\Middleware\AuthParticipant::class,
            'menu.access' => \App\Http\Middleware\EnsureMenuAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (PostTooLargeException $e, Request $request) {
            return response()->json([
                'message' => 'El contenido de la petición supera el tamaño máximo permitido por el servidor.',
                'hint' => 'Aumenta `post_max_size` y `upload_max_filesize` en PHP a al menos 128M. Si usas Nginx, revisa también `client_max_body_size`.',
            ], 413);
        });
    })->create();
