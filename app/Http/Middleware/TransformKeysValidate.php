<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Utils\Transformer\ArrayKeyTransformer;
use Closure;
use Illuminate\Http\Request;
use JsonException;

class TransformKeysValidate
{
    /**
     * @param Request $request
     * @throws ApiValidationException
     */
    public function handle($request, Closure $next)
    {
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH')) {
            $data = $request->request->all();
            if (!$request->isJson() || (count($data) === 0 && !json_validate($request->getContent()))) {
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
