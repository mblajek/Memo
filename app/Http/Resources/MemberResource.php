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
        new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: false),
        new OA\Property(property: 'isFacilityStaff', type: 'bool', example: false),
        new OA\Property(property: 'isDeactivatedFacilityStaff', type: 'bool', example: false),
        new OA\Property(property: 'isFacilityClient', type: 'bool', example: false),
    ],
    allOf: [new OA\Schema(ref: '#/components/schemas/AbstractJsonResource')],
)] /**
 * @method __construct(Facility $resource)
 * @mixin Member
 */
class MemberResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'userId' => true,
            'facilityId' => true,
            'hasFacilityAdmin' => fn(self $member) => ($member->facility_admin_grant_id !== null),
            'isFacilityStaff' => fn(self $member) => $member->isActiveStaff() === true,
            'isDeactivatedFacilityStaff' => fn(self $member) => $member->isActiveStaff() === false,
            'isFacilityClient' => fn(self $member) => ($member->client_id !== null),
        ];
    }
}
