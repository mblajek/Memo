<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\UserController;
use App\Utils\Date\DateHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('/v1')->group(function () {
    Route::prefix('/system')->group(function () {
        Route::prefix('/translation')->group(function () {
            Route::get('/{locale}/list', [SystemController::class, 'translationList']);
        });
        Route::prefix('/facility')->group(function () {
            Route::get('/list', [SystemController::class, 'facilityList']);
        });
    });
    Route::prefix('/user')->group(function () {
        Route::post('/login', [UserController::class, 'login']);
        Route::get('/status', [UserController::class, 'status']);
        Route::match(['get', 'post'], '/logout', [UserController::class, 'logout']);
        Route::post('/password', [UserController::class, 'password']);
    });
    Route::prefix('/admin')->group(function () {
        Route::get('/migrate/{hash?}', [AdminController::class, 'migrate']);
        Route::prefix('/user')->group(function () {
            Route::get('/list', [AdminUserController::class, 'list']);
        });
    });
});

Route::prefix('/util')->group(function () {
    Route::get('/uuid', fn() => Str::uuid()->toString());
    Route::get('/date', fn() => DateHelper::toZuluString((new DateTimeImmutable(timezone: new DateTimeZone('UTC')))));
});

Route::any('{any}', fn() => throw new NotFoundHttpException())->where('any', '.*');
