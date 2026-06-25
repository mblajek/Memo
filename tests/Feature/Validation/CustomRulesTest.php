<?php

namespace Tests\Feature\Validation;

use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Rules\StringIsTrimmedRule;
use App\Rules\UniqueWithMemoryRule;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Tests for the leaf custom validation rules used across the app. Each rule reports
 * failure through $validator->addFailure(...), so we run it through a real Validator
 * and inspect failed(). No DB is touched.
 */
class CustomRulesTest extends TestCase
{
    /** Full failed() map: [attribute => [ruleKey => params]]. */
    private function failed(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);
        $validator->passes();
        return $validator->failed();
    }

    /** @return string[] failed rule keys for the single field "f" (empty = passed). */
    private function failedKeys(array $fieldRules, mixed $value): array
    {
        return array_keys($this->failed(['f' => $value], ['f' => $fieldRules])['f'] ?? []);
    }

    // ------------------------------------------------------------------
    // DataTypeRule — strict PHP type via get_debug_type(); deliberately stricter than
    // Laravel's `boolean`/`integer`, which accept loosely-typed values like 1 or "5".
    // ------------------------------------------------------------------

    public function testDataTypeBoolAcceptsOnlyRealBooleans(): void
    {
        self::assertSame([], $this->failedKeys([DataTypeRule::bool()], true));
        self::assertSame([], $this->failedKeys([DataTypeRule::bool()], false));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::bool()], 1));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::bool()], '1'));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::bool()], 'true'));
    }

    public function testDataTypeIntAcceptsOnlyRealIntegers(): void
    {
        self::assertSame([], $this->failedKeys([DataTypeRule::int()], 5));
        self::assertSame([], $this->failedKeys([DataTypeRule::int()], -7));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::int()], '5'));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::int()], 5.0));
        self::assertSame(['custom.data_type'], $this->failedKeys([DataTypeRule::int()], true));
    }

    // ------------------------------------------------------------------
    // StringIsTrimmedRule — rejects leading/trailing space, tab, CR, LF.
    // ------------------------------------------------------------------

    public function testStringIsTrimmedAcceptsTrimmedStrings(): void
    {
        self::assertSame([], $this->failedKeys([new StringIsTrimmedRule()], 'hello'));
        self::assertSame([], $this->failedKeys([new StringIsTrimmedRule()], 'a b c')); // inner spaces are fine
    }

    public function testStringIsTrimmedRejectsSurroundingWhitespace(): void
    {
        foreach ([' x', 'x ', "\tx", "x\n", " x ", "\r\nx\r\n"] as $value) {
            self::assertSame(
                ['custom.trimmed'],
                $this->failedKeys([new StringIsTrimmedRule()], $value),
                'value: ' . json_encode($value),
            );
        }
    }

    // ------------------------------------------------------------------
    // ArrayIsListRule — value must be a sequential (list) array.
    // ------------------------------------------------------------------

    public function testArrayIsListAcceptsLists(): void
    {
        self::assertSame([], $this->failedKeys([new ArrayIsListRule()], []));
        self::assertSame([], $this->failedKeys([new ArrayIsListRule()], [1, 2, 3]));
        self::assertSame([], $this->failedKeys([new ArrayIsListRule()], ['a', 'b']));
    }

    public function testArrayIsListRejectsAssociativeAndNonArrays(): void
    {
        self::assertSame(['custom.data_type'], $this->failedKeys([new ArrayIsListRule()], ['a' => 1]));
        self::assertSame(['custom.data_type'], $this->failedKeys([new ArrayIsListRule()], [1 => 'a']));
        self::assertSame(['custom.data_type'], $this->failedKeys([new ArrayIsListRule()], 'string'));
        self::assertSame(['custom.data_type'], $this->failedKeys([new ArrayIsListRule()], 42));
    }

    // ------------------------------------------------------------------
    // UniqueWithMemoryRule — dedups across items in one run via STATIC memory.
    // ------------------------------------------------------------------

    public function testUniqueWithMemoryFlagsDuplicatesWithinARun(): void
    {
        UniqueWithMemoryRule::reset();
        $failed = $this->failed(
            ['items' => ['x', 'y', 'x', 'y', 'z']],
            ['items.*' => [new UniqueWithMemoryRule('items')]],
        );
        // First occurrences pass; the repeats (indexes 2 and 3) fail; the unique 'z' passes.
        self::assertArrayNotHasKey('items.0', $failed);
        self::assertArrayNotHasKey('items.1', $failed);
        self::assertSame(['custom.unique_items'], array_keys($failed['items.2'] ?? []));
        self::assertSame(['custom.unique_items'], array_keys($failed['items.3'] ?? []));
        self::assertArrayNotHasKey('items.4', $failed);
    }

    public function testUniqueWithMemoryRetainsStateUntilReset(): void
    {
        UniqueWithMemoryRule::reset();
        $this->failed(['items' => ['x']], ['items.*' => [new UniqueWithMemoryRule('items')]]);

        // No reset() here: the static memory still holds 'x', so a brand-new validation run
        // with the same value flags it. Callers rely on Valid::reset() (ApiController does this).
        $stillRemembered = $this->failed(['items' => ['x']], ['items.*' => [new UniqueWithMemoryRule('items')]]);
        self::assertSame(['custom.unique_items'], array_keys($stillRemembered['items.0'] ?? []));

        UniqueWithMemoryRule::reset();
        $cleared = $this->failed(['items' => ['x']], ['items.*' => [new UniqueWithMemoryRule('items')]]);
        self::assertArrayNotHasKey('items.0', $cleared);
    }
}
