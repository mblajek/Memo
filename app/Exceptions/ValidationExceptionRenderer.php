<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Throwable;

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

    private function defaultAppValidationTranslation(): array
    {
        $filePath = '../resources/lang/' . App::getLocale() . '/validation.json';
        try {
            $translations = json_decode(file_get_contents($filePath), associative: true, flags: JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            throw ConfigExceptionFactory::translations();
        }
        return $translations;
    }

    public function render(ValidationException $e): JsonResponse
    {
        $validator = $e->validator;
        $r = new \ReflectionClass($validator);
        $defaultTranslation = $this->defaultAppValidationTranslation();

        /** @noinspection PhpUnhandledExceptionInspection */
        $rules = $r->getProperty('rules')->getValue($validator);
        $exception = ExceptionFactory::validation();
        foreach ($validator->failed() as $field => $fieldErrors) {
            foreach ($fieldErrors as $rule => $interpolationData) {
                $type = null;
                if ($rule === Password::class) {
                    $rule = 'password.all_rules';
                } else {
                    $rule = Str::snake($rule);
                    if (array_key_exists($rule, $this->multiTypeRules)) {
                        $type = $this->matchType($rules[$field]);
                    }
                }
                $translation = ($type === null)
                    ? ($defaultTranslation[$rule] ?? null) : ($defaultTranslation[$rule][$type] ?? null);
                $interpolationFields = [];
                if ($translation) {
                    preg_match_all('/\{\{(\w+)}}/', $translation, $interpolationFields);
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
                $exception->addValidation($field, $rule . ($type ? ".$type" : ""), $interpolationData);
            }
        }
        return $exception->render();
    }
}
