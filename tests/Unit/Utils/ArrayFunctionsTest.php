<?php

namespace Tests\Unit\Utils;

use mysql_xdevapi\Exception;
use PHPUnit\Framework\TestCase;

use function App\Utils\array_flatten;

class ArrayFunctionsTest extends TestCase
{
    public function testArrayFlattenWhenNotArrayThrows()
    {
        $this->expectException(\TypeError::class);
        $this->expectExceptionMessage('Argument #1 ($array) must be of type array');

        array_flatten(new \stdClass());
    }

    public function testArrayFlattenDoesNotModifyAssociativeArrays()
    {
        self::assertEquals(['non' => 'list'], array_flatten(['non' => 'list']));
    }

    public function testArrayFlatten()
    {
        self::assertEquals([], array_flatten([]));
        self::assertEquals([1, 2, 3], array_flatten([1, 2, 3]));
        self::assertEquals(['a', 'b', 'c'], array_flatten(['a', 'b', 'c']));
        self::assertEquals([1, 2, 3, 'a', 'b', 'c'], array_flatten([[1, 2, 3], 'a', 'b', 'c']));
        self::assertEquals([1, 2, 3, 'a', 'b', 'c'], array_flatten([[1, 2, 3], ['a', 'b', 'c']]));
        self::assertEquals([1, 2, 3, 4, 5], array_flatten([1, [2, [3, [4, [5]]]]]));
        self::assertEquals([1, 2, 3, 4, 5], array_flatten([[[[[1], 2], 3], 4], 5]));
    }
}
