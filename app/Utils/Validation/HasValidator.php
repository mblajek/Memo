<?php

namespace App\Utils\Validation;

use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rules\Unique;

trait HasValidator
{
    abstract protected static function fieldValidator(string $field): string|array;

    // Empty not to make it abstract yet, will be changed to abstract when implemented
    // in all entities.
    protected static function validationRules(): array
    {
        return [];
    }

    public static function validator(RuleContext $context): array
    {
        return $context->selectRules(static::validationRules());
    }

    public static function getInsertValidator(array $fields): array
    {
        $ruleSet = [];
        foreach ($fields as $field) {
            $ruleSet[$field] = static::fieldValidator($field);
        }
        return $ruleSet;
    }

    public static function getPatchValidator(array $fields, Model|string $ignore): array
    {
        $ruleSet = self::getInsertValidator($fields);
        foreach ($ruleSet as $field => $rules) {
            if (is_array($rules)) {
                foreach ($rules as $rule) {
                    if ($rule instanceof Unique || $rule instanceof Valid) {
                        $rule->ignore($ignore);
                    }
                }
                $rules [] = 'sometimes';
            } else {
                $rules = $rules ? "$rules|sometimes" : "";
            }
            $ruleSet[$field] = $rules;
        }
        return $ruleSet;
    }

    public static function getResourceValidator(): array
    {
        return RuleContext::resource->selectRules(static::validationRules());
    }
}
