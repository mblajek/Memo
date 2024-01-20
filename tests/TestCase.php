<?php

namespace Tests;

use App\Utils\Date\DateHelper;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    public function post($uri, array $data = [], array $headers = []): TestResponse
    {
        return $this->json('post', $uri, $data, $headers);
    }

    public function patch($uri, array $data = [], array $headers = []): TestResponse
    {
        return $this->json('patch', $uri, $data, $headers);
    }

    /**
     * Now-time in ISO 8601 with timezone 'Z'.
     * @return string
     */
    protected static function now(): string
    {
        return DateHelper::toZuluString(CarbonImmutable::now());
    }
}
