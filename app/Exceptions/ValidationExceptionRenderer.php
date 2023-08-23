<?php

namespace App\Exceptions;

use App\Services\System\TranslationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

readonly class ValidationExceptionRenderer
{
    private array $multiTypeRules;
    private array $multiTypeTypes;
    private array $defaultTranslation;
    private Validator $validator;
    private array $rules;

    public function __construct(ValidationException $validationException)
    {
        $this->multiTypeRules = array_fill_keys(['between', 'gt', 'gte', 'lt', 'lte', 'max', 'min', 'size'], true);
        $this->multiTypeTypes = array_fill_keys(['array', 'file', 'numeric', 'string'], true);
        $this->validator = $validationException->validator;
        $this->rules = $this->validator->getRules();
    }

    private function matchType(array $fieldRules): string
    {
        foreach ($fieldRules as $fieldRule) {
            if (array_key_exists($fieldRule, $this->multiTypeTypes)) {
                return $fieldRule;
            }
        }
        return 'string';
    }

    private function matchRule(string $rule): string
    {
        return match ($rule) {
            Password::class => 'password.all_rules',
            default => Str::snake($rule),
        };
    }

    private function prepareField(
        string $rule,
        string $field,
        array $interpolationData,
        ApiValidationException $exception,
    ): void {
        $rule = $this->matchRule($rule);
        $ruleType = array_key_exists($rule, $this->multiTypeRules) ? $this->matchType($this->rules[$field]) : null;
        $ruleTranslation = ($ruleType === null) ? ($this->defaultTranslation[$rule] ?? null)
            : ($this->defaultTranslation[$rule][$ruleType] ?? null);

        $interpolationFields = [];
        if ($ruleTranslation) {
            preg_match_all('/\{\{(\w+)}}/', $ruleTranslation, $interpolationFields);
            $interpolationFields = array_values(
                array_filter($interpolationFields[1] ?? [], fn(string $a) => $a !== 'attribute')
            );
        }
        $interpolationDataAssoc =
            ($interpolationFields === ['values']) ?
                ['values' => $interpolationData] : array_combine(
                array_slice($interpolationFields, 0, count($interpolationData)),
                array_slice($interpolationData, 0, count($interpolationFields)),
            );
        $exception->addValidation($field, $rule . ($ruleType ? ".$ruleType" : ''), $interpolationDataAssoc);
    }

    private function renderOrThrow(ApiValidationException $exception): void
    {
        if (empty($this->defaultTranslation)) {
            // not in constructor to catch possible exception
            $this->defaultTranslation = TranslationsService::defaultAppValidationTranslation();
        }
        foreach ($this->validator->failed() as $field => $fieldErrors) {
            foreach ($fieldErrors as $rule => $interpolationData) {
                $this->prepareField($rule, $field, $interpolationData, $exception);
            }
        }
    }

    public function render(): JsonResponse
    {
        $exception = ExceptionFactory::validation();
        try {
            $this->renderOrThrow($exception);
            return $exception->render();
        } catch (ApiFatalException $additionalException) {
            return $exception->renderMany(addErrors: [$additionalException]);
        }
    }
}
