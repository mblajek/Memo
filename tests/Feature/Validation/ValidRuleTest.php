<?php

namespace Tests\Feature\Validation;

use App\Rules\Valid;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Behavioural tests for the App\Rules\Valid rule generator, driven through a real
 * Validator (no DB). Covers the strict type rules, size-rule failures, and the
 * presence/null matrix.
 *
 * Presence/null semantics produced by Valid::base() — these are INTENTIONALLY
 * inconsistent and the tests below pin the current behaviour:
 *   default (sometimes=false, nullable=false): field must be present; null -> required.
 *   nullable=true:                              field must STILL be present; null -> accepted.
 *   sometimes=true:                             absent -> skipped; present null -> required.
 *   sometimes=true + nullable=true:             absent -> skipped; null -> accepted.
 *
 * Note on failed() keys: built-in rules surface in PascalCase ("Max", "Present", ...);
 * the null-branch in Valid::validate() reports the literal lowercase "required". Both
 * render to the correct validation.* code (the renderer snake-cases on its side).
 */
class ValidRuleTest extends TestCase
{
    /** @return string[] failed rule keys for the field "f" (empty = passed). */
    private function failed(array $rule, array $data): array
    {
        Valid::reset();
        $validator = Validator::make($data, ['f' => $rule]);
        $validator->passes();
        return array_keys($validator->failed()['f'] ?? []);
    }

    // ------------------------------------------------------------------
    // Strict type rules (built-in Laravel rules layered with custom DataTypeRule).
    // ------------------------------------------------------------------

    public function testStringAcceptsStringsAndEnforcesLength(): void
    {
        self::assertSame([], $this->failed(Valid::string(), ['f' => 'hello']));
        self::assertSame(['String'], $this->failed(Valid::string(), ['f' => 123]));
        self::assertSame(['Max'], $this->failed(Valid::string(), ['f' => str_repeat('a', 251)]));
    }

    public function testEmptyStringIsSkippedAtTheValidatorLevel(): void
    {
        // Laravel skips non-implicit rules for empty/whitespace-only strings, so the Valid
        // instance is skipped here and "" passes at the bare validator level. This is fine
        // in context: HTTP requests pass through ConvertEmptyStringsToNull (and TrimStrings)
        // before validation, so "" arrives as null and is rejected as "required" (see
        // ValidationEndpointBehaviorTest). The rule and the middleware are meant to work
        // together; this test just documents the validator-only behaviour.
        self::assertSame([], $this->failed(Valid::string(), ['f' => '']));
        self::assertSame([], $this->failed(Valid::string(), ['f' => '   ']));
    }

    public function testIntAcceptsOnlyRealIntegers(): void
    {
        self::assertSame([], $this->failed(Valid::int(), ['f' => 5]));
        // The custom part: "5" passes Laravel's numeric/integer, but DataTypeRule demands a real int.
        self::assertSame(['custom.data_type'], $this->failed(Valid::int(), ['f' => '5']));
    }

    public function testBoolAcceptsOnlyRealBooleans(): void
    {
        self::assertSame([], $this->failed(Valid::bool(), ['f' => true]));
        self::assertSame([], $this->failed(Valid::bool(), ['f' => false]));
        // 1 passes Laravel's `boolean`, but DataTypeRule demands a real bool.
        self::assertSame(['custom.data_type'], $this->failed(Valid::bool(), ['f' => 1]));
    }

    public function testUuidMustBeLowercase(): void
    {
        // Valid::uuid() deliberately adds `lowercase` on top of `uuid` -- the custom bit worth
        // pinning. (That `uuid` itself rejects non-uuids is Laravel's job, not tested here.)
        self::assertSame([], $this->failed(Valid::uuid(), ['f' => '3f2504e0-4f89-41d3-9a0c-0305e82c3301']));
        self::assertSame(['Lowercase'], $this->failed(Valid::uuid(), ['f' => '3F2504E0-4F89-41D3-9A0C-0305E82C3301']));
    }

    public function testDateAndDatetimeFormats(): void
    {
        self::assertSame([], $this->failed(Valid::date(), ['f' => '2026-06-25']));
        self::assertSame(['DateFormat'], $this->failed(Valid::date(), ['f' => '25-06-2026']));
        self::assertSame([], $this->failed(Valid::datetime(), ['f' => '2026-06-25T10:30:00Z']));
        // Missing the Z / wrong separator -> wrong format.
        self::assertSame(['DateFormat'], $this->failed(Valid::datetime(), ['f' => '2026-06-25 10:30:00']));
    }

    public function testTrimmedRejectsSurroundingWhitespace(): void
    {
        self::assertSame([], $this->failed(Valid::trimmed(), ['f' => 'clean']));
        self::assertSame(['custom.trimmed'], $this->failed(Valid::trimmed(), ['f' => ' padded ']));
    }

    public function testListRejectsNonLists(): void
    {
        self::assertSame([], $this->failed(Valid::list(), ['f' => ['a', 'b']]));
        self::assertSame(['custom.data_type'], $this->failed(Valid::list(), ['f' => ['k' => 'v']]));
        self::assertSame(['Min'], $this->failed(Valid::list(), ['f' => []])); // list() requires min 1 item
    }

    // ------------------------------------------------------------------
    // Size-rule failures.
    // ------------------------------------------------------------------

    public function testSizeRuleFailuresProduceValidationErrors(): void
    {
        // max / min / between failures inside a Valid-wrapped field surface as ordinary
        // field errors, with a renderable message.
        $tooLong = Validator::make(['f' => str_repeat('a', 300)], ['f' => Valid::string()]);
        self::assertTrue($tooLong->fails());
        self::assertArrayHasKey('Max', $tooLong->failed()['f']);
        self::assertNotEmpty($tooLong->messages()->all());

        self::assertSame(['Min'], $this->failed(Valid::int(['min:10']), ['f' => 5]));
        self::assertSame(['Between'], $this->failed(Valid::int(['between:10,20']), ['f' => 5]));
    }

    // ------------------------------------------------------------------
    // The presence / null matrix (intentionally inconsistent — see class docblock).
    // ------------------------------------------------------------------

    public function testDefaultRequiresPresenceAndRejectsNull(): void
    {
        self::assertSame([], $this->failed(Valid::string(), ['f' => 'x']));
        self::assertSame(['Present'], $this->failed(Valid::string(), []));            // absent
        self::assertSame(['required'], $this->failed(Valid::string(), ['f' => null])); // present null
    }

    public function testNullableAcceptsNullButStillRequiresPresence(): void
    {
        self::assertSame([], $this->failed(Valid::string(nullable: true), ['f' => null]));
        // Inconsistency: `nullable` allows the value to be null, but the field must still be present.
        self::assertSame(['Present'], $this->failed(Valid::string(nullable: true), []));
    }

    public function testSometimesSkipsAbsentButRejectsNull(): void
    {
        self::assertSame([], $this->failed(Valid::string(sometimes: true), []));             // absent -> skipped
        // Inconsistency: `sometimes` makes an absent field OK, but a present null still fails.
        self::assertSame(['required'], $this->failed(Valid::string(sometimes: true), ['f' => null]));
        self::assertSame([], $this->failed(Valid::string(sometimes: true), ['f' => 'x']));
    }

    public function testSometimesNullableIsFullyOptional(): void
    {
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), []));
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), ['f' => null]));
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), ['f' => 'x']));
    }
}
