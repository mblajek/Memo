<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Vite;

class ViteUseNonce
{
    public function handle($request, Closure $next)
    {
        Vite::useCspNonce();
        return $next($request);
    }
}
