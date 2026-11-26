<?php

use App\Domain\Auth\Http\Controllers\AuthenticationController;
use App\Domain\Auth\Http\Controllers\PasswordResetController;
use App\Http\Middleware\EnsureActiveSession;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthenticationController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'send']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

Route::middleware(['auth:sanctum', EnsureActiveSession::class])->group(function (): void {
    Route::get('/user', [AuthenticationController::class, 'current']);
    Route::post('/logout', [AuthenticationController::class, 'logout']);
});
