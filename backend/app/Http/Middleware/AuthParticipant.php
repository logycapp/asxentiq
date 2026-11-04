<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class AuthParticipant
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token || ! str_starts_with($token, 'participant_')) {
            abort(401, 'No autenticado.');
        }

        if (! Cache::has('pt_' . $token)) {
            abort(401, 'Sesion de participante expirada.');
        }

        return $next($request);
    }
}