<?php

use App\Domain\Access\Models\NavigationItem;
use App\Domain\Auth\Http\Controllers\AuthenticationController;
use App\Domain\Auth\Http\Controllers\PasswordResetController;
use App\Domain\Dashboard\Http\Controllers\DashboardController;
use App\Domain\Imports\Http\Controllers\ImportController;
use App\Domain\People\Http\Controllers\PeopleController;
use App\Http\Middleware\EnsureActiveSession;
use App\Http\Middleware\RequirePermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthenticationController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'send']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

Route::middleware(['auth:sanctum', EnsureActiveSession::class])->group(function (): void {
    Route::get('/user', [AuthenticationController::class, 'current']);
    Route::post('/logout', [AuthenticationController::class, 'logout']);

    Route::get('/navigation', function (Request $request) {
        $permissionSlugs = $request->user()->roles()
            ->with('permissions')
            ->get()
            ->flatMap(fn ($role) => $role->permissions->pluck('slug'))
            ->unique()
            ->values();

        $items = NavigationItem::query()
            ->where('is_active', true)
            ->whereHas('permission', fn ($query) => $query->whereIn('slug', $permissionSlugs))
            ->orderBy('sort_order')
            ->get(['label', 'route_name', 'icon_key']);

        return response()->json(['data' => $items]);
    });

    Route::get('/dashboard', DashboardController::class)
        ->middleware(RequirePermission::class.':dashboard.view');

    Route::post('/imports', [ImportController::class, 'store'])
        ->middleware(RequirePermission::class.':imports.manage');

    Route::middleware(RequirePermission::class.':people.manage')->group(function (): void {
        Route::get('/people', [PeopleController::class, 'index']);
        Route::post('/people', [PeopleController::class, 'store']);
        Route::get('/people/{person}', [PeopleController::class, 'show']);
        Route::patch('/people/{person}', [PeopleController::class, 'update']);
        Route::delete('/people/{person}', [PeopleController::class, 'destroy']);
    });
    Route::post('/people/{person}/unlock', [PeopleController::class, 'unlock'])
        ->middleware(RequirePermission::class.':users.unlock');
});
