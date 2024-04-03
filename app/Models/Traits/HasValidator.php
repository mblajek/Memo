<?php

namespace App\Models\Traits;

use App\Models\Facility;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rules\Unique;

trait HasValidator
{
    abstract protected static function fieldValidator(string $field): string|array;

    public static function getInsertValidator(
        array $fields,
        array|bool|string|Facility $attributesFacility = false
    ): array {
        $ruleSet = [];
        foreach ($fields as $field) {
            $ruleSet[$field] = static::fieldValidator($field);
        }
        if ($attributesFacility !== false) {
            $attributes = is_array($attributesFacility)
                ? $attributesFacility : self::attrMap(facility: $attributesFacility);
            foreach ($attributes as $attribute) {
                if ($attribute->is_multi_value) {
                    $ruleSet[$attribute->api_name] = $attribute->getMultiValidator();
                    $ruleSet["$attribute->api_name.*"] = $attribute->getSingleValidator();
                } else {
                    $ruleSet[$attribute->api_name] = $attribute->getSingleValidator();
                }
            }
        }
        return $ruleSet;
    }

    public static function getPatchValidator(
        array $fields,
        Model|string $ignore,
        array|bool|string|Facility $attributesFacility = false,
    ): array {
        $ruleSet = self::getInsertValidator($fields, $attributesFacility);
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
