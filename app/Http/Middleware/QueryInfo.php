<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class QueryInfo
{
    private const string HEADER = 'X-QUERY-LOG';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if (App::hasDebugModeEnabled()) {
            $queryLog = DB::getQueryLog();
            // print_r($queryLog);die;
            $count = count($queryLog);
            $time = sprintf('%.1fms', array_reduce($queryLog, fn($a, $b) => $a + $b['time'], 0));
            $response->headers->set(self::HEADER, "$count / $time");
        }
        return $response;
    }
}
