<?php

namespace Tests\Unit\Services;

use App\Exceptions\ApiValidationException;
use App\Services\Attribute\AttributeValidation;
use PHPUnit\Framework\TestCase;

class AttributeApiNameTest extends TestCase
{
    use AttributeValidation;

    public function testSnakesValidApiNames(): void
    {
        self::assertSame('simple', $this->snakeApiName('simple'));
        self::assertSame('two_words', $this->snakeApiName('twoWords'));
        self::assertSame('with1digit', $this->snakeApiName('with1digit'));
        self::assertSame('digit_before1_upper', $this->snakeApiName('digitBefore1Upper'));
        // The convention used by migrations for random suffixes: a letter starts the last segment.
        self::assertSame('data_zgloszenia_u1d6d5712', $this->snakeApiName('dataZgloszeniaU1d6d5712'));
    }

    public function testRejectsApiNamesNotSurvivingRoundTrip(): void
    {
        // A snake_case name with a digit-initial segment: Str::camel drops the underscore for
        // good, and StringTransformer::camel refuses the name entirely.
        $this->expectException(ApiValidationException::class);
        $this->snakeApiName('foo_1d6d5712');
    }
}
