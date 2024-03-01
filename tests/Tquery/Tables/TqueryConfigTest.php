<?php

namespace Tests\Tquery\Tables;

use App\Tquery\Engine\TqService;
use PHPUnit\Framework\TestCase;

abstract class TqueryConfigTest extends TestCase
{
    private TqService $tquery;

    abstract protected function createTqService(): TqService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tquery = $this->createTqService();
    }

    protected function getSelectQueries(): array
    {
        self::assertNotNull($this->tquery, "Subclass must create an instance of TqService to test.");
        $reflection = new \ReflectionClass(get_class($this->tquery));
        try {
            $method = $reflection->getMethod('getConfig');
            $config = $method->invokeArgs($this->tquery, []);
            return array_map(fn($column) => $column->getSelectQuery(), $config->columns);
        } catch (\ReflectionException $e) {
            self::fail($e->__toString());
        }
    }
}
