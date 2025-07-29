<?php

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\Admin\AdminDatabaseController;
use App\Http\Controllers\Admin\AdminFacilityController;
use App\Http\Controllers\Admin\AdminMemberController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\DeveloperController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Facility\ClientController;
use App\Http\Controllers\Facility\ClientGroupController;
use App\Http\Controllers\Facility\ClientNotificationController;
use App\Http\Controllers\Facility\ClientTqueryController;
use App\Http\Controllers\Facility\FacilityAdminController;
use App\Http\Controllers\Facility\MemberTqueryController;
use App\Http\Controllers\Facility\NotificationTqueryController;
use App\Http\Controllers\Facility\StaffController;
use App\Http\Controllers\Facility\StaffTqueryController;
use App\Http\Controllers\FacilityMeeting\MeetingAttendantTqueryController;
use App\Http\Controllers\FacilityMeeting\MeetingClientTqueryController;
use App\Http\Controllers\FacilityMeeting\MeetingController;
use App\Http\Controllers\FacilityMeeting\MeetingSeriesController;
use App\Http\Controllers\FacilityMeeting\MeetingTqueryController;
use App\Http\Controllers\MailController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\Tquery\AdminFacilityTqueryController;
use App\Http\Controllers\Tquery\AdminUserTqueryController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

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
        Route::get('/status', [SystemController::class, 'status']);
        Route::post('/log', [SystemController::class, 'log']);
    });
    Route::prefix('/user')->group(function () {
        Route::patch('', [UserController::class, 'patch']);
        Route::post('/login', [AuthController::class, 'login'])->middleware(['throttle:5,1,api_login']);
        Route::get('/status/{facility?}', [UserController::class, 'status']);
        Route::match(['get', 'post'], '/logout', [AuthController::class, 'logout']);
        Route::post('/password', [AuthController::class, 'password']);
        Route::prefix('/otp')->group(function () {
            Route::post('/generate', [AuthController::class, 'otpGenerate'])
                ->middleware(['throttle:5,1,api_otp_generate']);
            Route::post('/configure', [AuthController::class, 'otpConfigure'])
                ->middleware(['throttle:5,1,api_otp_configure']);
        });
        Route::put('/storage/{key}', [UserController::class, 'storagePut']);
        Route::get('/storage/{key?}', [UserController::class, 'storageGet']);
    });
    Route::prefix('/admin')->group(function () {
        Route::prefix('/db-dump')->group(function () {
            Route::post('/create', [AdminDatabaseController::class, 'create']);
            Route::post('/restore/{dbDump}', [AdminDatabaseController::class, 'restore']);
            Route::get('/tquery', [AdminDatabaseController::class, 'dbDumpsTqueryGet']);
            Route::post('/tquery', [AdminDatabaseController::class, 'dbDumpsTqueryPost']);
        });
        Route::prefix('/developer')->group(function () {
            Route::get('/migrate/{hash?}', [DeveloperController::class, 'migrate']);
            Route::post('/overwrite-metadata', [DeveloperController::class, 'overwriteMetadata']);
            Route::post('/patch-staff', [DeveloperController::class, 'patchStaff']);
            Route::prefix('/log')->group(function () {
                Route::get('/tquery', [DeveloperController::class, 'logTqueryGet']);
                Route::post('/tquery', [DeveloperController::class, 'logTqueryPost']);
            });
        });
        Route::prefix('/user')->group(function () {
            Route::get('/list', [AdminUserController::class, 'list']);
            Route::post('/', [AdminUserController::class, 'post']);
            Route::patch('/{user}', [AdminUserController::class, 'patch']);
            Route::get('/tquery', [AdminUserTqueryController::class, 'get']);
            Route::post('/tquery', [AdminUserTqueryController::class, 'post']);
        });
        Route::prefix('/facility')->group(function () {
            Route::get('/list', [AdminFacilityController::class, 'list']);
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
                Route::post('/', [ClientController::class, 'post']);
                Route::patch('/{user}', [ClientController::class, 'patch']);
                Route::delete('/{user}', [ClientController::class, 'delete']);
                Route::get('/list', [ClientController::class, 'list']);
                Route::get('/tquery', [ClientTqueryController::class, 'get']);
                Route::post('/tquery', [ClientTqueryController::class, 'post']);
                Route::patch('/{user}/notification/method', [ClientNotificationController::class, 'patch']);
            });
            Route::prefix('/staff')->group(function () {
                Route::get('/list', [StaffController::class, 'list']);
                Route::patch('/{user}', [StaffController::class, 'patch']);
                Route::get('/tquery', [StaffTqueryController::class, 'get']);
                Route::post('/tquery', [StaffTqueryController::class, 'post']);
            });
            Route::prefix('/admin')->group(function () {
                Route::patch('/{user}', [FacilityAdminController::class, 'patch']);
            });
            Route::get('/tquery', [MemberTqueryController::class, 'get']);
            Route::post('/tquery', [MemberTqueryController::class, 'post']);
        });
        Route::prefix('/meeting')->group(function () {
            Route::post('/', [MeetingController::class, 'post']);
            Route::get('/list', [MeetingController::class, 'list']);
            Route::post('/conflicts', [MeetingSeriesController::class, 'conflicts']);
            Route::patch('/{meeting}', [MeetingController::class, 'patch']);
            Route::delete('/{meeting}', [MeetingSeriesController::class, 'delete']);
            Route::post('/{meeting}/clone', [MeetingSeriesController::class, 'clone']);
            Route::get('/tquery', [MeetingTqueryController::class, 'get']);
            Route::post('/tquery', [MeetingTqueryController::class, 'post']);
            Route::get('/attendant/tquery', [MeetingAttendantTqueryController::class, 'get']);
            Route::post('/attendant/tquery', [MeetingAttendantTqueryController::class, 'post']);
            Route::get('/client/tquery', [MeetingClientTqueryController::class, 'get']);
            Route::post('/client/tquery', [MeetingClientTqueryController::class, 'post']);
        });
        Route::prefix('/notification')->group(function () {
            Route::get('/tquery', [NotificationTqueryController::class, 'get']);
            Route::post('/tquery', [NotificationTqueryController::class, 'post']);
        });
        Route::prefix('/client-group')->group(function () {
            Route::post('/', [ClientGroupController::class, 'post']);
            Route::get('/list', [ClientGroupController::class, 'list']);
            Route::patch('/{clientGroup}', [ClientGroupController::class, 'patch']);
            Route::delete('/{clientGroup}', [ClientGroupController::class, 'delete']);
            Route::post('/assign-to-attendants', [ClientGroupController::class, 'assignToAttendants']);
        });
        Route::prefix('/admin')->group(function () {
            Route::prefix('/attribute')->group(function () {
                Route::post('/', [FacilityAdminController::class, 'postAttribute']);
            });
            Route::prefix('/dictionary')->group(function () {
                Route::post('/', [FacilityAdminController::class, 'postDictionary']);
            });
            Route::prefix('/position')->group(function () {
                Route::post('/', [FacilityAdminController::class, 'postPosition']);
            });
        });
    });
    Route::prefix('/mail')->group(function () {
        Route::post('/test', [MailController::class, 'test']);
    });
});

Route::any('{any}', fn() => ExceptionFactory::routeNotFound()->render())->where('any', '.*');
