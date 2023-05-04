<?php

namespace App\Exceptions;

use App\Services\System\TranslationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use ReflectionException;

class ValidationExceptionRenderer
{
    private array $multiTypeRules;
    private array $multiTypeTypes;

    public function __construct()
    {
        $this->multiTypeRules = array_flip(['between', 'gt', 'gte', 'lt', 'lte', 'max', 'min', 'size']);
        $this->multiTypeTypes = array_flip(['array', 'file', 'numeric', 'string']);
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

    private function renderOrThrow(ValidationException $originalException, ApiValidationException $exception): void
    {
        $validator = $originalException->validator;
        $validatorReflection = new ReflectionClass($validator);
        $defaultTranslation = TranslationsService::defaultAppValidationTranslation();
        try {
            $rules = $validatorReflection->getProperty('rules')->getValue($validator);
        } catch (ReflectionException) {
            throw ConfigExceptionFactory::reflectionRules();
        }
        foreach ($validator->failed() as $field => $fieldErrors) {
            foreach ($fieldErrors as $rule => $interpolationData) {
                $ruleType = null;
                if ($rule === Password::class) {
                    $rule = 'password.all_rules';
                } else {
                    $rule = Str::snake($rule);
                    if (array_key_exists($rule, $this->multiTypeRules)) {
                        $ruleType = $this->matchType($rules[$field]);
                    }
                }
                $ruleTranslation = ($ruleType === null)
                    ? ($defaultTranslation[$rule] ?? null) : ($defaultTranslation[$rule][$ruleType] ?? null);
                $interpolationFields = [];
                if ($ruleTranslation) {
                    preg_match_all('/\{\{(\w+)}}/', $ruleTranslation, $interpolationFields);
                    $interpolationFields = array_values(
                        array_filter(
                            $interpolationFields[1] ?? [],
                            fn(string $a) => $a !== 'attribute',
                        )
                    );
                }
                $interpolationData =
                    ($interpolationFields === ['values']) ?
                        ['values' => $interpolationData] : array_combine(
                        array_slice($interpolationFields, 0, count($interpolationData)),
                        array_slice($interpolationData, 0, count($interpolationFields)),
                    );
                $exception->addValidation($field, $rule . ($ruleType ? ".$ruleType" : ""), $interpolationData);
            }
        }
    }

    public function render(ValidationException $e): JsonResponse
    {
        $exception = ExceptionFactory::validation();
        try {
            $this->renderOrThrow($e, $exception);
            return $exception->render();
        } catch (ApiFatalException $additionalException) {
            return $exception->renderMany(addErrors: [$additionalException]);
        }
    }
}
