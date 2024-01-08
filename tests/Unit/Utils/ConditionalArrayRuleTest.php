<?php

namespace Tests\Unit\Utils;

use App\Utils\ConditionalArrayRule;
use PHPUnit\Framework\TestCase;

class ConditionalArrayRuleTest extends TestCase
{
    public function testIsConditionalArray()
    {
        self::assertFalse(ConditionalArrayRule::is_conditional_array([]));
        self::assertFalse(ConditionalArrayRule::is_conditional_array(['a', 'b', 'c']));
        self::assertFalse(ConditionalArrayRule::is_conditional_array([1, 2, 3]));
        self::assertTrue(ConditionalArrayRule::is_conditional_array([true, 'a', 'b', 'c']));
        self::assertTrue(ConditionalArrayRule::is_conditional_array([false, 'a', 'b', 'c']));
        self::assertTrue(ConditionalArrayRule::is_conditional_array([true, false, false]));
    }

    public function testProcessConditionalArray()
    {
        self::assertEquals([],
            ConditionalArrayRule::process_conditional_array([false, 'a', 'b', 'c']));
        self::assertEquals(['a', 'b', 'c'],
            ConditionalArrayRule::process_conditional_array([true, 'a', 'b', 'c']));
        self::assertEquals([],
            ConditionalArrayRule::process_conditional_array([true]));
        self::assertEquals(['a', 'b', 'c'],
            ConditionalArrayRule::process_conditional_array(['a', 'b', 'c']));
        self::assertEquals([],
            ConditionalArrayRule::process_conditional_array([]));
    }
}
