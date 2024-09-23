<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Utils\Transformer\StringTransformer;
use Closure;
use Illuminate\Http\Request;
use ValueError;

class TransformKeysValidate
{
    /** @throws ApiValidationException|ApiException */
    public function handle(Request $request, Closure $next)
    {
        if (($content = $request->getContent())) {
            $data = $request->request->all();
            if (!$request->isJson() || (count($data) === 0 && !json_validate($content))) {
                throw ExceptionFactory::invalidJson();
            }
            try {
                $request->replace(StringTransformer::snakeKeys($data));
            } catch (ValueError) {
                ExceptionFactory::snakeCaseRequest()->throw();
            }
        }

        return $next($request);
    }
}
