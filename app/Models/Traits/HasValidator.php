<?php

namespace App\Models\Traits;

use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rules\Unique;

trait HasValidator
{
    abstract protected static function fieldValidator(string $field): string|array;

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
}
