<?php

namespace Services\System;

use App\Services\System\MergePatchService;
use stdClass;
use Tests\TestCase;

class MergePatchServiceTest extends TestCase
{
    private MergePatchService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MergePatchService();
    }

    public static function dataProvider(): array
    {
        return
            array_map(fn($testCase) => [(object)$testCase[0], $testCase[1], (object)$testCase[2]],
                [
// Not all of these test cases make sense for us, but they're possible, so I left them.
//@formatter:off
//   ORIGINAL (object)              PATCH (array)                           RESULT (object)
// Update field
 0 => [["a" => "b"],                  ["a" => "c"],                           ["a" => "c"]                         ],
 // Add field
 1 => [["a" => "b"],                  ["b" => "c"],                           ["a" => "b", "b" => "c"]             ],
 // Remove field
 2 => [["a" => "b"],                  ["a" => null],                          ["a" => null]                        ],
 // Remove field and leave rest untouched
 3 => [["a" => "b", "b" => "c"],      ["a" => null],                          ["a" => null, "b" => "c"]            ],
 // Update array to string
 4 => [["a" => ["b"]],                ["a" => "c"],                           ["a" => "c"]                         ],
 // Update string to array
 5 => [["a" => "c"],                  ["a" => ["b"]],                         ["a" => ["b"]]                       ],
 // Add empty field
 6 => [["a" => ["b" => "c"]],         ["a" => ["b" => "d", "c" => null]],     ["a" => ["b" => "d", "c" => null]]   ],
 // Update object to array
 7 => [["a" => [["b" => "c"]]],       ["a" => [1]],                           ["a" => [1]]                         ],
 // Update array field (no merging arrays)
 8 => [["a" => ["b", "c"]],           ["a" => ["c", "d"]],                    ["a" => ["c", "d"]]                  ],
 // Update object to array
 9 => [["a" => ["b" => "c"]],         ["a"=>["d"]],                           ["a"=>["d"]],                        ],
// Add field with preexisting empty field
10 => [["e" => null],                 ["a" => 1],                             ["e" => null, "a" => 1]              ],
// Add object field
11 => [(object)[],                    ["a" => ["bb" => ["ccc" => null]]],     ["a" => ["bb" => ["ccc" => null]]]   ],
//@formatter:on
                ]);
    }

    /**
     * @dataProvider dataProvider
     */
    public function testMergeInto($original, $patch, $result)
    {
        $this->service->mergeInto($original, $patch);
        $this->assertEquals($result, $original);
    }
}
