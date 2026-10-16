<?php

namespace Tests\Feature\Tquery;

use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;

class TqueryPagingTest extends TqueryTestCase
{
    private const URL = '/api/v1/admin/facility/tquery';

    private const MAX_PAGING_VALUE = 2 ** 31 - 1;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function postWithPaging(array $paging): TestResponse
    {
        return $this->post(self::URL, [
            'columns' => self::columns('id'),
            'paging' => $paging,
        ]);
    }

    public function testLargePageSize(): void
    {
        $this->assertTqueryData($this->postWithPaging(['size' => 1_000_000])->assertOk()->json());
    }

    public function testMaxPagingValues(): void
    {
        $response = $this->postWithPaging([
            'size' => self::MAX_PAGING_VALUE,
            'number' => self::MAX_PAGING_VALUE,
            'offset' => self::MAX_PAGING_VALUE,
        ]);
        $this->assertTqueryData($response->assertOk()->json(), 0);
    }

    public static function tooLargePagingProvider(): array
    {
        return [
            'size' => [['size' => self::MAX_PAGING_VALUE + 1], 'paging.size'],
            'number' => [['size' => 1, 'number' => self::MAX_PAGING_VALUE + 1], 'paging.number'],
            'offset' => [['size' => 1, 'offset' => self::MAX_PAGING_VALUE + 1], 'paging.offset'],
            'overflowing page offset' => [['size' => PHP_INT_MAX, 'number' => 3], 'paging.size'],
        ];
    }

    #[DataProvider('tooLargePagingProvider')]
    public function testTooLargePagingValues(array $paging, string $field): void
    {
        $this->postWithPaging($paging)->assertBadRequest()->assertJson([
            'errors' => [
                ['code' => 'exception.validation'],
                ['field' => $field, 'code' => 'validation.max.numeric'],
            ],
        ]);
    }
}
