<?php

namespace App\Models\Traits;

use App\Models\Facility;
use App\Rules\IgnoreIdRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rules\Unique;

trait HasValidator
{
    abstract protected static function fieldValidator(string $field): string|array;

    /**
     * $attributesFacility selects the attribute values included in the rule set: false skips
     * them, an array is a ready attribute map, null (a global row) selects only the global
     * attributes, and any other value selects the scope of attrMap().
     */
    public static function getInsertValidator(
        array $fields,
        array|bool|string|Facility|null $attributesFacility = false
    ): array {
        $ruleSet = [];
        foreach ($fields as $field) {
            $ruleSet[$field] = static::fieldValidator($field);
        }
        if ($attributesFacility !== false) {
            $attributes = is_array($attributesFacility) ? $attributesFacility
                : (($attributesFacility === null) ? self::attrMapGlobal()
                    : self::attrMap(facility: $attributesFacility));
            foreach ($attributes as $attribute) {
                if (array_key_exists($attribute->api_name, $ruleSet)) {
                    continue;
                }
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
        array|bool|string|Facility|null $attributesFacility = false,
    ): array {
        $ruleSet = self::getInsertValidator($fields, $attributesFacility);
        foreach ($ruleSet as $field => $rules) {
            if (is_array($rules)) {
                foreach ($rules as $rule) {
                    if ($rule instanceof Unique || $rule instanceof IgnoreIdRule) {
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

    public static function getProhibitedValidator(
        array $fields,
        array|bool|string|Facility|null $attributesFacility = false,
    ): array {
        return array_map(fn() => 'missing', self::getInsertValidator($fields, $attributesFacility));
    }
}
