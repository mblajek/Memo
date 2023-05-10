<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;

trait ApiExceptionTrait
{
    public readonly string $errorCode;
    public readonly ?array $errorData;
    public readonly int $httpCode;
    protected array $validationErrors = [];

    public function getData(): array
    {
        return array_filter(
            ['code' => $this->errorCode, 'data' => $this->errorData, 'validation' => $this->validationErrors]
        );
    }

    public function getJson(): string
    {
        return json_encode($this->getData());
    }

    /** @param array<ApiExceptionTrait> $addErrors */
    public function renderMany(array $addErrors = []): JsonResponse
    {
        $errors = [];
        foreach (array_merge([$this], $addErrors) as $error) {
            $data = $error->getData();
            if (App::hasDebugModeEnabled() && ($error instanceof ApiFatalException)) {
                $data['trace'] = $error->getTrace();
            }
            $errors[] = $data;
        }
        return new JsonResponse(['errors' => $errors], $this->httpCode);
    }

    /** called by framework */
    public function render(): JsonResponse
    {
        return $this->renderMany();
    }
}
