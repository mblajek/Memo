<?php

namespace Tests\Unit\Utils;

use App\Utils\ConditionalArrayRule;
use PHPUnit\Framework\TestCase;

class ConditionalArrayRuleTest extends TestCase
{
    public function testIsConditionalArray()
    {
        self::assertFalse(ConditionalArrayRule::isConditionalArray([]));
        self::assertFalse(ConditionalArrayRule::isConditionalArray(['a', 'b', 'c']));
        self::assertFalse(ConditionalArrayRule::isConditionalArray([1, 2, 3]));
        self::assertTrue(ConditionalArrayRule::isConditionalArray([true, 'a', 'b', 'c']));
        self::assertTrue(ConditionalArrayRule::isConditionalArray([false, 'a', 'b', 'c']));
        self::assertTrue(ConditionalArrayRule::isConditionalArray([true, false, false]));
    }

    public function testProcessConditionalArray()
    {
        self::assertEquals([],
            ConditionalArrayRule::processIfConditionalArray([false, 'a', 'b', 'c']));
        self::assertEquals(['a', 'b', 'c'],
            ConditionalArrayRule::processIfConditionalArray([true, 'a', 'b', 'c']));
        self::assertEquals([],
            ConditionalArrayRule::processIfConditionalArray([true]));
        self::assertEquals(['a', 'b', 'c'],
            ConditionalArrayRule::processIfConditionalArray(['a', 'b', 'c']));
        self::assertEquals([],
            ConditionalArrayRule::processIfConditionalArray([]));
    }
}
