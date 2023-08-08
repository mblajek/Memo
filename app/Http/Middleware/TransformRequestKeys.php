<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Utils\Transformer\ArrayKeyTransformer;
use Closure;
use Illuminate\Http\Request;

class TransformRequestKeys
{
    /**
     * @throws ApiValidationException
     */
    public function handle($request, Closure $next)
    {
        /** @var Request $request */
        if (!$request->isMethod('GET')) {
            $data = $request->request->all();

            if (ArrayKeyTransformer::hasSnake($data)) {
                throw ExceptionFactory::snakeCaseRequest();
            }

            $request->replace(ArrayKeyTransformer::toSnake($data));
        }

        return $next($request);
    }
}
