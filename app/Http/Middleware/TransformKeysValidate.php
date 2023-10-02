<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Utils\Transformer\ArrayKeyTransformer;
use Closure;
use Illuminate\Http\Request;

class TransformKeysValidate
{
    /** @throws ApiValidationException */
    public function handle(Request $request, Closure $next)
    {
        if (($content = $request->getContent())) {
            $data = $request->request->all();
            if (!$request->isJson() || (count($data) === 0 && !json_validate($content))) {
                throw ExceptionFactory::invalidJson();
            }

            if (ArrayKeyTransformer::hasSnake($data)) {
                throw ExceptionFactory::snakeCaseRequest();
            }

            $request->replace(ArrayKeyTransformer::toSnake($data));
        }

        return $next($request);
    }
}
