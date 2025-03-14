<?php

use App\Exceptions\ExceptionFactory;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::get('/docs-remote/{path}', function (string $path) {
    $data = Cache::remember("docs-remote/$path", 150 /* 2.5m */, function () use ($path): int|array {
        $response = Http::get(env('DOCS_URL') . $path);
        return ($response->status() === 200) ? [$response->header('Content-Type'), $response->body()] : 404;
    });
    return ($data === 404) ? ExceptionFactory::notFound()->render() :
        new Response($data[1], headers: ['Content-Type' => $data[0] ?: 'text/plain']);
})->where('path', '([^\\.]+.)+'); // avoid /../

Route::any('/docs/{any}', fn() => ExceptionFactory::notFound()->render())->where('any', '.*');
Route::any('/img/{any}', fn() => ExceptionFactory::notFound()->render())->where('any', '.*');

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
    // throw error on missing database
    App\Models\Facility::query()->count();
    return view('app');
})->where('any', '[\\w/-]*');
