<?php

namespace App\Csp;

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
