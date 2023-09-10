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

    private function treeSearchTranslation(string $rule): ?string
    {
        // todo: move to translations
        $ruleArray = explode('.', $rule);
        $options = 2 ** (count($ruleArray) - 1);
        for ($option = 0; $option < $options; $option++) {
            $keys = [$ruleArray[0]];
            foreach (array_slice($ruleArray, 1) as $i => $part) {
                if ($option & (1 << $i)) {
                    $keys[count($keys) - 1] .= ".$part";
                } else {
                    $keys[] = $part;
                }
            }
            $currentTree = $this->defaultTranslation;
            foreach ($keys as $key) {
                if (!is_array($currentTree) || !array_key_exists($key, $currentTree)) {
                    continue 2;
                }
                $currentTree = $currentTree[$key];
            }
            if (is_string($currentTree)) {
                return $currentTree;
            }
        }
        return null;
    }

    private function prepareField(
        string $rule,
        string $field,
        array $interpolationData,
        ApiValidationException $exception,
    ): void {
        $rule = $this->matchRule($rule);
        $ruleType = array_key_exists($rule, $this->multiTypeRules) ? $this->matchType($this->rules[$field]) : null;
        /** @var ?string $ruleTranslation */
        $ruleTranslation = ($ruleType === null) ? $this->treeSearchTranslation($rule)
            : ($this->defaultTranslation[$rule][$ruleType] ?? null);

        $interpolationFields = [];
        if ($ruleTranslation) {
            preg_match_all('/\{\{(?<field>\w+)[, ]*(?<type>\\w*)}}/', $ruleTranslation, $interpolationFields);
            $interpolationFields = array_values(
                array_filter($interpolationFields['field'] ?? [], fn(string $a) => strtolower($a) !== 'attribute')
            );
        }
        if ($interpolationFields === ['values']) {
            $interpolationDataAssoc = ['values' => $interpolationData];
        } else {
            $interpolationDataAssoc = [];
            foreach ($interpolationFields as $fieldPosition => $fieldName) {
                if (($fieldData = $interpolationData[$fieldName] ?? $interpolationData[$fieldPosition] ?? null)) {
                    $interpolationDataAssoc[$fieldName] = $fieldData;
                }
            }
        }
        $exception->addValidation(Str::camel($field), $rule . ($ruleType ? ".$ruleType" : ''), $interpolationDataAssoc);
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
