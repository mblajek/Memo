<?php

namespace Tests\Feature\Validation;

use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Rules\StringIsTrimmedRule;
use App\Rules\UniqueWithMemoryRule;
use App\Rules\Valid;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Tests for the leaf custom validation rules used across the app. Each rule reports
 * failure through $validator->addFailure(...), so we run it through a real Validator
 * and inspect failed(). No DB is touched.
 */
class CustomRulesTest extends TestCase
{
    use ValidationTestTrait;

    /** Full failed() map: [attribute => [ruleKey => params]]. */
    private function failedx(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);
        $validator->passes();
        return $validator->failed();
    }

    /** @return string[] failed rule keys for the single field "f" (empty = passed). */
    private function failedKeys(array $fieldRules, mixed $value): array
    {
        return $this->failed($fieldRules, $value);
        //  return array_keys($this->failed(['f' => $value], ['f' => $fieldRules])['f'] ?? []);
    }

    // ------------------------------------------------------------------
    // DataTypeRule — strict PHP type via get_debug_type(); deliberately stricter than
    // Laravel's `boolean`/`integer`, which accept loosely-typed values like 1 or "5".
    // ------------------------------------------------------------------

    public function testDataTypeBoolAcceptsOnlyRealBooleans(): void
    {
        self::assertSame([], $this->failed([DataTypeRule::bool()], true));
        self::assertSame([], $this->failed([DataTypeRule::bool()], false));
        self::assertSame(['custom.data_type,type:bool'], $this->failed([DataTypeRule::bool()], 1));
        self::assertSame(['custom.data_type,type:bool'], $this->failed([DataTypeRule::bool()], '1'));
        self::assertSame(['custom.data_type,type:bool'], $this->failed([DataTypeRule::bool()], 'true'));
    }

    public function testDataTypeIntAcceptsOnlyRealIntegers(): void
    {
        self::assertSame([], $this->failed([DataTypeRule::int()], 5));
        self::assertSame([], $this->failed([DataTypeRule::int()], -7));
        self::assertSame(['custom.data_type,type:int'], $this->failed([DataTypeRule::int()], '5'));
        self::assertSame(['custom.data_type,type:int'], $this->failed([DataTypeRule::int()], 5.0));
        self::assertSame(['custom.data_type,type:int'], $this->failed([DataTypeRule::int()], true));
    }

    // ------------------------------------------------------------------
    // StringIsTrimmedRule — rejects leading/trailing space, tab, CR, LF.
    // ------------------------------------------------------------------

    public function testStringIsTrimmedAcceptsTrimmedStrings(): void
    {
        self::assertSame([], $this->failed([new StringIsTrimmedRule()], 'hello'));
        self::assertSame([], $this->failed([new StringIsTrimmedRule()], 'a b c')); // inner spaces are fine
    }

    public function testStringIsTrimmedRejectsSurroundingWhitespace(): void
    {
        foreach ([' x', 'x ', "\tx", "x\n", " x ", "\r\nx\r\n"] as $value) {
            self::assertSame(
                ['custom.trimmed'],
                $this->failed([new StringIsTrimmedRule()], $value),
                'value: ' . json_encode($value),
            );
        }
    }

    // ------------------------------------------------------------------
    // ArrayIsListRule — value must be a sequential (list) array.
    // ------------------------------------------------------------------

    public function testArrayIsListAcceptsLists(): void
    {
        self::assertSame([], $this->failed([new ArrayIsListRule()], []));
        self::assertSame([], $this->failed([new ArrayIsListRule()], [1, 2, 3]));
        self::assertSame([], $this->failed([new ArrayIsListRule()], ['a', 'b']));
    }

    public function testArrayIsListRejectsAssociativeAndNonArrays(): void
    {
        self::assertSame(['custom.data_type,type:list'], $this->failed([new ArrayIsListRule()], ['f' => ['a' => 1]]));
        self::assertSame(['custom.data_type,type:list'], $this->failed([new ArrayIsListRule()], ['f' => [1 => 'a']]));
        self::assertSame(['custom.data_type,type:list'], $this->failed([new ArrayIsListRule()], 'string'));
        self::assertSame(['custom.data_type,type:list'], $this->failed([new ArrayIsListRule()], 42));
    }

    // ------------------------------------------------------------------
    // UniqueWithMemoryRule — dedups across items in one run via STATIC memory.
    // ------------------------------------------------------------------

    public function testUniqueWithMemoryFlagsDuplicatesWithinARun(): void
    {
        self::assertSame(
            ['f.2,custom.unique_items', 'f.3,custom.unique_items'],
            $this->failed(
                ['f.*' => [new UniqueWithMemoryRule('x')]],
                ['f' => ['x', 'y', 'x', 'y', 'z']],
            ),
        );
    }

    public function testUniqueWithMemoryRetainsStateUntilReset(): void
    {
        self::assertSame(
            [],
            $this->failed(
                ['f.*' => [new UniqueWithMemoryRule('x')]],
                ['f' => ['x', 'y', 'z']],
            ),
        );

        // No reset() here: the static memory still holds 'x', so a brand-new validation run
        // with the same value flags it. Callers rely on Valid::reset() (ApiController does this).
        self::assertSame(
            ['f.1,custom.unique_items', 'f.3,custom.unique_items'],
            $this->failed(
                ['f.*' => [new UniqueWithMemoryRule('x')]],
                ['f' => ['a', 'x', 'b', 'y']],
                reset: false,
            ),
        );

        // with reset
        self::assertSame(
            [],
            $this->failed(
                ['f.*' => [new UniqueWithMemoryRule('x')]],
                ['f' => ['a', 'b', 'x', 'y', 'z']],
            ),
        );
    }
}
