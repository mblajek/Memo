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
    private array $interpolationDataTransform;

    public function __construct(ValidationException $validationException)
    {
        $this->multiTypeRules = array_fill_keys(['between', 'gt', 'gte', 'lt', 'lte', 'max', 'min', 'size'], true);
        $this->multiTypeTypes = array_fill_keys(['array', 'file', 'numeric', 'string'], true);
        $this->validator = $validationException->validator;
        $this->rules = $this->validator->getRules();
        $this->interpolationDataTransform = array_fill_keys([
            //@formatter:off
            'accepted_if', 'declined_if', 'different', 'in_array', 'missing_if', 'missing_unless', 'prohibited_if',
            'prohibited_unless', 'prohibits', 'required_if', 'required_if_accepted', 'required_unless', 'same',
            'custom.require_present', 'custom.require_not_null'
            //@formatter:on
        ],
            fn($interpolationData) => array_map(Str::camel(...), $interpolationData));
    }

    private function matchType(array $fieldRules): string
    {
        foreach ($fieldRules as $fieldRule) {
            if (is_string($fieldRule) && array_key_exists($fieldRule, $this->multiTypeTypes)) {
                return $fieldRule;
            }
        }
        return 'string';
    }

    private function matchRule(string $rule): string
    {
        return match ($rule) {
            Str::snake(Password::class) => 'password.all_rules',
            default => Str::snake($rule),
        };
    }

    private function treeSearchTranslation(string $rule): ?string
    {
        $currentTree = $this->defaultTranslation;
        foreach (explode('.', $rule) as $key) {
            if (!is_array($currentTree) || !array_key_exists($key, $currentTree)) {
                return null;
            }
            $currentTree = $currentTree[$key];
        }
        return is_string($currentTree) ? $currentTree : null;
    }

    private function prepareField(
        string $rule,
        string $field,
        array $interpolationData,
        ApiValidationException $exception,
    ): void {
        $rule = $this->matchRule($rule);
        if (array_key_exists($rule, $this->interpolationDataTransform)) {
            $transform = $this->interpolationDataTransform[$rule];
            $interpolationData = $transform($interpolationData);
        }
        $ruleType = array_key_exists($rule, $this->multiTypeRules) ? $this->matchType($this->rules[$field]) : null;
        /** @var ?string $ruleTranslation */
        $ruleTranslation = ($ruleType === null) ? $this->treeSearchTranslation($rule)
            : ($this->defaultTranslation[$rule][$ruleType] ?? null);

        $interpolationFields = [];
        if ($ruleTranslation) {
            // Match the interpolation, as described here: https://www.i18next.com/translation-function/formatting
            preg_match_all('/\{\{\s*(?<field>\w+).*?}}/', $ruleTranslation, $interpolationFields);
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
