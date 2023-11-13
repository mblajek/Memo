<?php

namespace Tests\Unit\Utils\Validation;

use App\Utils\Validation\RuleContext;
use PHPUnit\Framework\TestCase;

use function App\Utils\Validation\insert;
use function App\Utils\Validation\patch;
use function App\Utils\Validation\resource;

class RuleContextTest extends TestCase
{
    public function testOrCreatesABitfield()
    {
        $this->assertEquals(0, RuleContext::or());
        $this->assertEquals(0b001, RuleContext::or(RuleContext::resource));
        $this->assertEquals(0b010, RuleContext::or(RuleContext::insert));
        $this->assertEquals(0b100, RuleContext::or(RuleContext::patch));
        $this->assertEquals(0b001, RuleContext::or(RuleContext::resource, RuleContext::resource));
        $this->assertEquals(0b011, RuleContext::or(RuleContext::resource, RuleContext::insert));
        $this->assertEquals(0b101, RuleContext::or(RuleContext::resource, RuleContext::patch));
        $this->assertEquals(0b011, RuleContext::or(RuleContext::insert, RuleContext::resource));
        $this->assertEquals(0b010, RuleContext::or(RuleContext::insert, RuleContext::insert));
        $this->assertEquals(0b110, RuleContext::or(RuleContext::insert, RuleContext::patch));
        $this->assertEquals(0b101, RuleContext::or(RuleContext::patch, RuleContext::resource));
        $this->assertEquals(0b110, RuleContext::or(RuleContext::patch, RuleContext::insert));
        $this->assertEquals(0b100, RuleContext::or(RuleContext::patch, RuleContext::patch));
        $this->assertEquals(0b111, RuleContext::or(RuleContext::resource, RuleContext::insert, RuleContext::patch));
    }

    public function testSelectRulesCopiesRulesWithoutContext()
    {
        $rules = [
            "field1" => ["rule1", "rule2", new \stdClass()],
            "field2" => ["rule3", "rule4", new \stdClass()]
        ];

        $resourceRules = RuleContext::resource->selectRules($rules);
        $insertRules = RuleContext::insert->selectRules($rules);
        $patchRules = RuleContext::patch->selectRules($rules);

        $this->assertEquals($rules, $resourceRules);
        $this->assertEquals($rules, $insertRules);
        $this->assertEquals($rules, $patchRules);
    }

    public function testSelectRulesFiltersRulesByContext()
    {
        $rules = [
            "field1" => [
                resource("resource rule"),
                insert("insert rule"),
                patch("patch rule")
            ],
        ];

        $resourceRules = RuleContext::resource->selectRules($rules);
        $insertRules = RuleContext::insert->selectRules($rules);
        $patchRules = RuleContext::patch->selectRules($rules);


        $this->assertEquals(["field1" => ["resource rule"]], $resourceRules);
        $this->assertEquals(["field1" => ["insert rule"]], $insertRules);
        $this->assertEquals(["field1" => ["patch rule"]], $patchRules);
    }

    public function testSelectRulesCopiesRulesInOrder()
    {
        $rules = [
            "field1" => [
                "all rule 1",
                resource("resource rule"),
                insert("insert rule"),
                patch("patch rule"),
                "all rule 2"
            ],
        ];

        $resourceRules = RuleContext::resource->selectRules($rules);
        $insertRules = RuleContext::insert->selectRules($rules);
        $patchRules = RuleContext::patch->selectRules($rules);

        $this->assertEquals(["field1" => ["all rule 1", "resource rule", "all rule 2"]], $resourceRules);
        $this->assertEquals(["field1" => ["all rule 1", "insert rule", "all rule 2"]], $insertRules);
        $this->assertEquals(["field1" => ["all rule 1", "patch rule", "all rule 2"]], $patchRules);
    }
}
