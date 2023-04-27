<?php

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

Route::prefix('/util')->group(function () {
    Route::get('/uuid', fn() => Str::uuid()->toString());
    Route::get('/date', fn() => DateHelper::toZuluString((new DateTimeImmutable(timezone: new DateTimeZone('UTC')))));
});

Route::any('{any}', fn() => throw new NotFoundHttpException())->where('any', '.*');
