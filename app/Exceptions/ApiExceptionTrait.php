<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Stringable;
use UnitEnum;

trait ApiExceptionTrait
{
    public readonly string $errorCode;
    public readonly array $errorData;
    public readonly int $httpCode;
    protected array $validationErrors = [];

    public function getData(): array
    {
        return ['code' => $this->errorCode, 'data' => $this->errorData];
    }

    public function getJson(): string
    {
        return json_encode($this->getData());
    }

    /** @param array<ApiExceptionTrait> $addErrors */
    public function renderMany(array $addErrors = []): JsonResponse
    {
        $errors = [];
        foreach (array_merge([$this], $addErrors, $this->validationErrors) as $error) {
            $errorData = is_array($error) ? $error : $error->getData();
            if (App::hasDebugModeEnabled() && ($error instanceof ApiFatalException)) {
                $errorData['trace'] = $error->getTrace();
                array_walk_recursive($errorData['trace'], function (&$field) {
                    if (is_object($field) && !($field instanceof Stringable)) {
                        $field = '@' . get_class($field) . (($field instanceof UnitEnum) ? ('::' . $field->name) : '');
                    }
                });
            }
            $errors[] = array_filter($errorData, fn($field) => $field !== [] && $field !== '' && $field !== null);
        }
        return new JsonResponse(['errors' => $errors], $this->httpCode);
    }

    /** called by framework */
    public function render(): JsonResponse
    {
        return $this->renderMany();
    }
}
