<?php

namespace Tests\Feature\Tquery;

use App\Models\Facility;
use PHPUnit\Framework\Attributes\DataProvider;

class FacilityUserTqueryColumnsTest extends TqueryTestCase
{
    private const array ACCOUNT_SECURITY_COLUMNS = [
        'passwordExpireAt',
        'hasEmailVerified',
        'lastLoginFailureAt',
        'lastPasswordChangeAt',
        'isOtpRequired',
        'otpRequiredAt',
        'hasOtpConfigured',
    ];

    private const array CROSS_FACILITY_COLUMNS = [
        'lastLoginFacility.id',
        'lastLoginFacility.name',
        'facilities.*.name',
        'facilities.count',
        'hasFacilityAdmin',
        'isStaff',
        'isClient',
    ];

    /** Shown to all the staff by the front end. */
    private const array USER_COLUMNS = [
        'name',
        'email',
        'hasPassword',
        'hasGlobalAdmin',
        'lastLoginSuccessAt',
        'isManagedByThisFacility',
        'managedByFacility.name',
    ];

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
    }

    public static function entityProvider(): array
    {
        return [
            'member' => ['user'],
            'client' => ['user/client'],
            'staff' => ['user/staff'],
        ];
    }

    private function url(string $entity): string
    {
        return "/api/v1/facility/{$this->facility->id}/$entity/tquery";
    }

    private function columnNames(string $entity): array
    {
        return array_column($this->tpiGet($this->url($entity))['columns'], 'name');
    }

    #[DataProvider('entityProvider')]
    public function testStaffGetsNoAccountSecurityOrCrossFacilityColumns(string $entity): void
    {
        $this->prepareFacilityStaff($this->facility);
        $columns = $this->columnNames($entity);
        $this->assertEmpty(array_intersect([...self::ACCOUNT_SECURITY_COLUMNS, ...self::CROSS_FACILITY_COLUMNS], $columns));
        $this->assertEmpty(array_diff(self::USER_COLUMNS, $columns));
    }

    #[DataProvider('entityProvider')]
    public function testFacilityAdminGetsAccountSecurityButNoCrossFacilityColumns(string $entity): void
    {
        $this->prepareFacilityAdmin($this->facility, globalAdmin: true);
        $columns = $this->columnNames($entity);
        $this->assertEmpty(array_diff([...self::USER_COLUMNS, ...self::ACCOUNT_SECURITY_COLUMNS], $columns));
        $this->assertEmpty(array_intersect(self::CROSS_FACILITY_COLUMNS, $columns));
    }

    #[DataProvider('entityProvider')]
    public function testStaffCannotSelectOrFilterByHiddenColumns(string $entity): void
    {
        $this->prepareFacilityStaff($this->facility);
        foreach (['hasOtpConfigured', 'facilities.*.name'] as $column) {
            $this->post($this->url($entity), [
                'columns' => self::columns('id', $column),
                'paging' => self::paging(10),
            ])->assertBadRequest();
            $this->post($this->url($entity), [
                'columns' => self::columns('id'),
                'filter' => self::filterColumn($column, 'null'),
                'paging' => self::paging(10),
            ])->assertBadRequest();
        }
    }
}
