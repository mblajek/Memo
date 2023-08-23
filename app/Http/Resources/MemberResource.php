<?php

namespace App\Http\Resources;

use App\Models\Facility;
use App\Models\Member;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MemberResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: 'false'),
        new OA\Property(property: 'staffMemberId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
        new OA\Property(property: 'clientId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
    ]
)] /**
 * @method __construct(Facility $resource)
 * @mixin Member
 */
class MemberResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'userId' => true,
            'facilityId' => true,
            'hasFacilityAdmin' => fn(self $member) => ($member->facility_admin_grant_id !== null),
            'staffMemberId' => true,
            'clientId' => true,
        ];
    }
}
