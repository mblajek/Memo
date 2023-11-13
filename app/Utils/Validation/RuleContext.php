<?php

namespace App\Utils\Validation;

use function App\Utils\array_flatten;

/** Used as an indicator to mark which rules apply to a context. */
enum RuleContext: int
{
    /** Rules which should always be met. Ex. after PATCH */
    case resource = 1 << 0;
    /** Rules which should be met an object in the insert (POST) request */
    case insert = 1 << 1;
    /** Rules which should be met an object in the PATCH request */
    case patch = 1 << 2;

    /** Returns an array of rules applicable to this context, based on an array of regular rules and RulesInContext
     * objects.
     * When context not specified - rule applies to all
     */
    public function selectRules(array $allRules): array
    {
        $result = [];
        foreach ($allRules as $field => $rules) {
            $fieldRules = [];
            foreach ($rules as $rule) {
                if ($rule instanceof RulesInContext) {
                    if ($rule->matches($this)) {
                        $fieldRules [] = $rule->rules;
                    }
                } else {
                    $fieldRules [] = $rule;
                }
            }
            $result[$field] = array_flatten($fieldRules);
        }
        return $result;
    }

    /** Creates a bit mask of all given contexts. */
    public static function or(RuleContext ...$contexts): int
    {
        return array_reduce($contexts, fn(int $mask, RuleContext $context) => $mask | $context->value, 0);
    }
}
