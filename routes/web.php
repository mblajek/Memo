<?php

use App\Exceptions\ExceptionFactory;
use Illuminate\Support\Facades\Route;

Route::any('/docs/{any}', fn() => ExceptionFactory::notFound()->render())->where('any', '.*');

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('{any}', function () {
    return view('app');
})->where('any', '.*');
