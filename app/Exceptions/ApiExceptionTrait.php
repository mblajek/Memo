<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Stringable;
use Throwable;
use UnitEnum;

/** @mixin Throwable */
trait ApiExceptionTrait
{
    public ?string $customMessage = null;
    public readonly string $errorCode;
    public readonly array $errorData;
    public readonly int $httpCode;
    protected array $validationErrors = [];

    public function getData(): array
    {
        return ['message' => $this->customMessage, 'code' => $this->errorCode, 'data' => $this->errorData];
    }

    public function getJson(): string
    {
        return json_encode($this->getData());
    }

    /** @param array<ApiExceptionTrait> $addErrors */
    public function renderContent(array $addErrors = []): array
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
        return ['errors' => $errors];
    }

    /** @param array<ApiExceptionTrait> $addErrors */
    public function renderMany(array $addErrors = []): JsonResponse
    {
        return new JsonResponse($this->renderContent($addErrors), $this->httpCode);
    }

    /** called by framework */
    public function render(): JsonResponse
    {
        return $this->renderMany();
    }

    public function setMessage(string $message): self
    {
        $this->customMessage = $message;
        $this->message = $this->getJson();
        return $this;
    }

    public function getStatusCode(): int
    {
        return $this->httpCode;
    }

    public function getHeaders(): array
    {
        return [];
    }
}
