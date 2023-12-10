<?php

namespace Tests\Unit\Utils;

use PHPUnit\Framework\TestCase;

use function App\Utils\is_conditional_array;
use function App\Utils\process_conditional_array;

class ArrayFunctionsTest extends TestCase
{
    public function testIsConditionalArray()
    {
        self::assertFalse(is_conditional_array([]));
        self::assertFalse(is_conditional_array(['a', 'b', 'c']));
        self::assertFalse(is_conditional_array([1, 2, 3]));
        self::assertTrue(is_conditional_array([true, 'a', 'b', 'c']));
        self::assertTrue(is_conditional_array([false, 'a', 'b', 'c']));
        self::assertTrue(is_conditional_array([true, false, false]));
    }

    public function testProcessConditionalArray()
    {
        self::assertEquals([], process_conditional_array([false, 'a', 'b', 'c']));
        self::assertEquals(['a', 'b', 'c'], process_conditional_array([true, 'a', 'b', 'c']));
        self::assertEquals([], process_conditional_array([true]));
        self::assertEquals(['a', 'b', 'c'], process_conditional_array(['a', 'b', 'c']));
        self::assertEquals([], process_conditional_array([]));
    }
}
