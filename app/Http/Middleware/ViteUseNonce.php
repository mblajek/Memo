<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class ViteUseNonce
{
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();
        return $next($request);
    }
}
