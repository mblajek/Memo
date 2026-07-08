<?php

namespace Tests\Feature\Validation;

use App\Rules\Valid;
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
 */
class ValidRuleTest extends TestCase
{
    use ValidationTestTrait;

    // ------------------------------------------------------------------
    // Strict type rules (built-in Laravel rules layered with custom DataTypeRule).
    // ------------------------------------------------------------------

    public function testStringAcceptsStringsAndEnforcesLength(): void
    {
        self::assertSame([], $this->failed(Valid::string(), 'hello'));
        self::assertSame(['string'], $this->failed(Valid::string(), 123));
        self::assertSame(['max.string,max:250'], $this->failed(Valid::string(), str_repeat('a', 251)));
    }

    public function testEmptyStringIsSkippedAtTheValidatorLevel(): void
    {
        // Laravel skips non-implicit rules for empty/whitespace-only strings, so the Valid
        // instance is skipped here and "" passes at the bare validator level. This is fine
        // in context: HTTP requests pass through ConvertEmptyStringsToNull (and TrimStrings)
        // before validation, so "" arrives as null and is rejected as "required" (see
        // ValidationEndpointBehaviorTest). The rule and the middleware are meant to work
        // together; this test just documents the validator-only behaviour.
        self::assertSame([], $this->failed(Valid::string(), ''));
        self::assertSame([], $this->failed(Valid::string(), '   '));
    }

    public function testIntAcceptsOnlyRealIntegers(): void
    {
        self::assertSame([], $this->failed(Valid::int(), 5));
        // The custom part: "5" passes Laravel's numeric/integer, but DataTypeRule demands a real int.
        self::assertSame(['custom.data_type,type:int'], $this->failed(Valid::int(), '5'));
    }

    public function testBoolAcceptsOnlyRealBooleans(): void
    {
        self::assertSame([], $this->failed(Valid::bool(), true));
        self::assertSame([], $this->failed(Valid::bool(), false));
        // 1 passes Laravel's `boolean`, but DataTypeRule demands a real bool.
        self::assertSame(['custom.data_type,type:bool'], $this->failed(Valid::bool(), 1));
    }

    public function testUuidMustBeLowercase(): void
    {
        // Valid::uuid() deliberately adds `lowercase` on top of `uuid` -- the custom bit worth
        // pinning. (That `uuid` itself rejects non-uuids is Laravel's job, not tested here.)
        self::assertSame([], $this->failed(Valid::uuid(), '3f2504e0-4f89-41d3-9a0c-0305e82c3301'));
        self::assertSame(['lowercase'], $this->failed(Valid::uuid(), '3F2504E0-4F89-41D3-9A0C-0305E82C3301'));
    }

    public function testDateAndDatetimeFormats(): void
    {
        self::assertSame([], $this->failed(Valid::date(), '2026-06-25'));
        self::assertSame(['date_format'], $this->failed(Valid::date(), '25-06-2026'));
        self::assertSame([], $this->failed(Valid::datetime(), '2026-06-25T10:30:00Z'));
        // Missing the Z / wrong separator -> wrong format.
        self::assertSame(['date_format'], $this->failed(Valid::datetime(), '2026-06-25T10:30:00+00:00'));
        self::assertSame(['date_format'], $this->failed(Valid::datetime(), '2026-06-25 10:30:00'));
    }

    public function testTrimmedRejectsSurroundingWhitespace(): void
    {
        self::assertSame([], $this->failed(Valid::trimmed(), 'clean'));
        self::assertSame(['custom.trimmed'], $this->failed(Valid::trimmed(), ' padded '));
    }

    public function testListRejectsNonLists(): void
    {
        self::assertSame([], $this->failed(Valid::list(), ['f' => ['a', 'b']]));
        self::assertSame(['custom.data_type,type:list'], $this->failed(Valid::list(), ['f' => ['k' => 'v']]));
        self::assertSame(['min.array,min:1'], $this->failed(Valid::list(), ['f' => []])); // list() requires min 1 item
    }

    // ------------------------------------------------------------------
    // Size-rule failures.
    // ------------------------------------------------------------------

    public function testSizeRuleFailuresProduceValidationErrors(): void
    {
        self::assertSame(['max.string,max:250'], $this->failed(Valid::string(), str_repeat('a', 300)));
        self::assertSame(['min.numeric,min:10'], $this->failed(Valid::int(['min:10']), 5));
        self::assertSame(['between.numeric,min:10,max:20'], $this->failed(Valid::int(['between:10,20']), 5));
    }

    // ------------------------------------------------------------------
    // The presence / null matrix (intentionally inconsistent — see class docblock).
    // ------------------------------------------------------------------

    public function testDefaultRequiresPresenceAndRejectsNull(): void
    {
        self::assertSame([], $this->failed(Valid::string(), 'x'));
        self::assertSame(['present'], $this->failed(Valid::string(), []));            // absent
        self::assertSame(['required'], $this->failed(Valid::string(), null)); // present null
    }

    public function testNullableAcceptsNullButStillRequiresPresence(): void
    {
        self::assertSame([], $this->failed(Valid::string(nullable: true), null));
        // Inconsistency: `nullable` allows the value to be null, but the field must still be present.
        self::assertSame(['present'], $this->failed(Valid::string(nullable: true), []));
    }

    public function testSometimesSkipsAbsentButRejectsNull(): void
    {
        self::assertSame([], $this->failed(Valid::string(sometimes: true), []));             // absent -> skipped
        // Inconsistency: `sometimes` makes an absent field OK, but a present null still fails.
        self::assertSame(['required'], $this->failed(Valid::string(sometimes: true), null));
        self::assertSame([], $this->failed(Valid::string(sometimes: true), 'x'));
    }

    public function testSometimesNullableIsFullyOptional(): void
    {
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), []));
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), null));
        self::assertSame([], $this->failed(Valid::string(sometimes: true, nullable: true), 'x'));
    }
}
