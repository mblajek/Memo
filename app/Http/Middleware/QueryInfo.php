<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class QueryInfo
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if (App::hasDebugModeEnabled()) {
            $queryLog = DB::getQueryLog();
            // print_r($queryLog);die;
            $count = count($queryLog);
            $time = sprintf('%.1fms', array_reduce($queryLog, fn($a, $b) => $a + $b['time'], 0));
            $response->headers->set('x-query-log', "$count / $time");
        }
        return $response;
    }
}
