<?php

namespace App\Models\Traits;

use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rules\Unique;

use App\Utils\ConditionalArrayRule;

trait HasValidator
{
    abstract protected static function fieldValidator(string $field): string|array;

    // Empty not to make it abstract yet, will be changed to abstract when implemented
    // in all entities.
    // $original is only given during PATCH
    protected static function validationRules(bool $isResource, bool $isInsert, $isPatch, Model $original = null): array
    {
        return [];
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
        return self::processRules(static::validationRules(true, false, false));
    }

    /** Rules is an array of rules for each field. Field rules could be: a single string, an object, a "conditional
     * array" with a boolean as a first item or an array of the above. This function processes the "conditional arrays"
     * and returns one of those: a string, an array of "validators" which are either strings or objects.
     */
    protected static function processRules(array $rules): array
    {
        return array_map(function ($fieldRules) {
            if (!is_array($fieldRules)) {
                return $fieldRules;
            }

            if (ConditionalArrayRule::is_conditional_array($fieldRules)) {
                return ConditionalArrayRule::process_conditional_array($fieldRules);
            }

            return Arr::flatten(
                array_map(function ($subRules) {
                    if (!is_array($subRules)) {
                        return $subRules;
                    }
                    return ConditionalArrayRule::process_conditional_array($subRules);
                }, $fieldRules)
            );
        }, $rules);
    }
}
