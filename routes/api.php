<?php

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminFacilityController;
use App\Http\Controllers\Admin\AdminMemberController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Facility\ClientController;
use App\Http\Controllers\Facility\ClientTqueryController;
use App\Http\Controllers\Facility\MeetingController;
use App\Http\Controllers\Facility\MeetingTqueryController;
use App\Http\Controllers\Facility\StaffController;
use App\Http\Controllers\Facility\StaffTqueryController;
use App\Http\Controllers\MailController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\Tquery\AdminFacilityTqueryController;
use App\Http\Controllers\Tquery\AdminUserTqueryController;
use App\Http\Controllers\UserController;
use App\Utils\Date\DateHelper;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

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
        Route::prefix('/attribute')->group(function () {
            Route::get('/list', [SystemController::class, 'attributeList']);
        });
    });
    Route::prefix('/user')->group(function () {
        Route::patch('', [UserController::class, 'patch']);
        Route::post('/login', [UserController::class, 'login'])->middleware(['throttle:5,1,api_login']);
        Route::get('/status/{facility?}', [UserController::class, 'status']);
        Route::match(['get', 'post'], '/logout', [UserController::class, 'logout']);
        Route::post('/password', [UserController::class, 'password']);
        Route::put('/storage/{key}', [UserController::class, 'storagePut']);
        Route::get('/storage/{key?}', [UserController::class, 'storageGet']);
    });
    Route::prefix('/admin')->group(function () {
        Route::get('/migrate/{hash?}', [AdminController::class, 'migrate']);
        Route::prefix('/user')->group(function () {
            Route::get('/list', [AdminUserController::class, 'list']);
            Route::post('/', [AdminUserController::class, 'post']);
            Route::patch('/{user}', [AdminUserController::class, 'patch']);
            Route::get('/tquery', [AdminUserTqueryController::class, 'get']);
            Route::post('/tquery', [AdminUserTqueryController::class, 'post']);
        });
        Route::prefix('/facility')->group(function () {
            Route::post('/', [AdminFacilityController::class, 'post']);
            Route::patch('/{facility}', [AdminFacilityController::class, 'patch']);
            Route::get('/tquery', [AdminFacilityTqueryController::class, 'get']);
            Route::post('/tquery', [AdminFacilityTqueryController::class, 'post']);
        });
        Route::prefix('/member')->group(function () {
            Route::post('/', [AdminMemberController::class, 'post']);
            Route::patch('/{member}', [AdminMemberController::class, 'patch']);
            Route::delete('/{member}', [AdminMemberController::class, 'delete']);
        });
    });
    Route::prefix('/facility/{facility}')->group(function () {
        Route::prefix('/user')->group(function () {
            Route::prefix('/client')->group(function () {
                Route::get('/list', [ClientController::class, 'list']);
                Route::get('/tquery', [ClientTqueryController::class, 'get']);
                Route::post('/tquery', [ClientTqueryController::class, 'post']);
            });
            Route::prefix('/staff')->group(function () {
                Route::get('/list', [StaffController::class, 'list']);
                Route::get('/tquery', [StaffTqueryController::class, 'get']);
                Route::post('/tquery', [StaffTqueryController::class, 'post']);
            });
        });
        Route::prefix('/meeting')->group(function () {
            Route::post('/', [MeetingController::class, 'post']);
            Route::get('/list', [MeetingController::class, 'list']);
            Route::patch('/{meeting}', [MeetingController::class, 'patch']);
            Route::delete('/{meeting}', [MeetingController::class, 'delete']);
            Route::get('/tquery', [MeetingTqueryController::class, 'get']);
            Route::post('/tquery', [MeetingTqueryController::class, 'post']);
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
