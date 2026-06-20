<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/{any}', function (Request $request) {
    $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:4200'), '/');

    return redirect()->away($frontendUrl.$request->getPathInfo());
})->where('any', '.*');
