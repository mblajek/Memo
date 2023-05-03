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

    private function getData(): array
    {
        return array_filter(
            ['code' => $this->errorCode, 'data' => $this->errorData, 'validation' => $this->validationErrors]
        );
    }

    public function getJson(): string
    {
        return json_encode($this->getData());
    }

    public function render(): JsonResponse
    {
        $result = $this->getData();
        if (App::hasDebugModeEnabled() && ($this instanceof ApiFatalException)) {
            $result['trace'] = $this->getTrace();
        }
        return new JsonResponse(['errors' => [$result]], $this->httpCode);
    }
}
