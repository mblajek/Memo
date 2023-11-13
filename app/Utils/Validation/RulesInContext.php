<?php

namespace App\Utils\Validation;

class RulesInContext
{
    private int $ruleContextMask;
    public array $rules = [];

    /**
     * @param int $ruleContextMask
     * @param array $rules
     */
    public function __construct(int $ruleContextMask, array $rules)
    {
        $this->ruleContextMask = $ruleContextMask;
        $this->rules = $rules;
    }

    public function matches(RuleContext $context): bool
    {
        return $this->ruleContextMask & $context->value;
    }
}

function resource(mixed ...$rules): RulesInContext
{
    return new RulesInContext(RuleContext::resource->value, $rules);
}

function insert(mixed ...$rules): RulesInContext
{
    return new RulesInContext(RuleContext::insert->value, $rules);
}

function patch(mixed ...$rules): RulesInContext
{
    return new RulesInContext(RuleContext::patch->value, $rules);
}

function insertAndPatch(mixed ...$rules): RulesInContext
{
    return new RulesInContext(RuleContext::or(RuleContext::insert, RuleContext::patch), $rules);
}

function insertAndResource(mixed ...$rules): RulesInContext
{
    return new RulesInContext(RuleContext::or(RuleContext::insert, RuleContext::patch), $rules);
}
