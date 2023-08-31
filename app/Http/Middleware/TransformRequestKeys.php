<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Utils\Transformer\ArrayKeyTransformer;
use Closure;
use Illuminate\Http\Request;
use JsonException;

class TransformRequestKeys
{
    /**
     * @throws ApiValidationException
     */
    public function handle($request, Closure $next)
    {
        $this->validateJson($request);

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

    /**
     * @throws ApiValidationException
     */
    private function validateJson($request): void
    {
        try {
            $content = $request->getContent();
            if ($content) {
                json_decode($content, false, 512, JSON_THROW_ON_ERROR);
            }
        } catch (JsonException) {
            throw ExceptionFactory::invalidJson();
        }
    }
}
