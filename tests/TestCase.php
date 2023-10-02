<?php

namespace Tests;

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
}
