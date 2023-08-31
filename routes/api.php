<?php

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminFacilityController;
use App\Http\Controllers\Admin\AdminMemberController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\MailController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\Tquery\AdminUserTqueryController;
use App\Http\Controllers\UserController;
use App\Utils\Date\DateHelper;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

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

Route::prefix('/v1')->group(function () {
    Route::prefix('/system')->group(function () {
        Route::prefix('/translation')->group(function () {
            Route::get('/{locale}/list', [SystemController::class, 'translationList']);
        });
        Route::prefix('/facility')->group(function () {
            Route::get('/list', [SystemController::class, 'facilityList']);
        });
        Route::prefix('/dictionary')->group(function () {
            Route::get('/list', [SystemController::class, 'dictionaryList']);
        });
    });
    Route::prefix('/user')->group(function () {
        Route::patch('', [UserController::class, 'patch']);
        Route::post('/login', [UserController::class, 'login']);
        Route::get('/status/{facility?}', [UserController::class, 'status']);
        Route::match(['get', 'post'], '/logout', [UserController::class, 'logout']);
        Route::post('/password', [UserController::class, 'password']);
    });
    Route::prefix('/admin')->group(function () {
        Route::get('/migrate/{hash?}', [AdminController::class, 'migrate']);
        Route::prefix('/user')->group(function () {
            Route::get('/list', [AdminUserController::class, 'list']);
            Route::post('/', [AdminUserController::class, 'post']);
            Route::patch('/{user}', [AdminUserController::class, 'patch']);
            Route::get('/tquery', [AdminUserTqueryController::class, 'get']);
        });
        Route::prefix('/facility')->group(function () {
            Route::post('/', [AdminFacilityController::class, 'post']);
            Route::patch('/{facility}', [AdminFacilityController::class, 'patch']);
        });
        Route::prefix('/member')->group(function () {
            Route::post('/', [AdminMemberController::class, 'post']);
            Route::patch('/{member}', [AdminMemberController::class, 'patch']);
            Route::delete('/{member}', [AdminMemberController::class, 'delete']);
        });
    });
    Route::prefix('/mail')->group(function () {
        Route::post('/test', [MailController::class, 'test']);
    });
});

Route::prefix('/util')->group(function () {
    Route::get('/uuid', fn() => Str::uuid()->toString());
    Route::get('/date', fn() => DateHelper::toZuluString((new DateTimeImmutable(timezone: new DateTimeZone('UTC')))));
});

Route::any('{any}', fn() => ExceptionFactory::routeNotFound()->render())->where('any', '.*');
