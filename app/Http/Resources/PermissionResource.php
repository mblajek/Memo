<?php

namespace App\Http\Resources;

use App\Http\Permissions\PermissionObject;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PermissionsResource',
    properties: [
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'unverified', type: 'bool', example: 'false'),
        new OA\Property(property: 'verified', type: 'bool', example: 'true'),
        new OA\Property(property: 'globalAdmin', type: 'bool', example: 'false'),
        new OA\Property(property: 'facilityMember', type: 'bool', example: 'false'),
        new OA\Property(property: 'facilityClient', type: 'bool', example: 'false'),
        new OA\Property(property: 'facilityStaff', type: 'bool', example: 'false'),
        new OA\Property(property: 'facilityAdmin', type: 'bool', example: 'false'),
        new OA\Property(property: 'developer', type: 'bool', example: 'false'),
    ],
)] /**
 * @method __construct(PermissionObject $resource)
 * @mixin PermissionObject
 */
class PermissionResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'userId' => fn(self $permission) => $permission->user?->id,
            'facilityId' => fn(self $permission) => $permission->facility?->id,
            'unverified' => false,
            'verified' => false,
            'globalAdmin' => false,
            'facilityMember' => false,
            'facilityClient' => false,
            'facilityStaff' => false,
            'facilityAdmin' => false,
            'developer' => false,
        ];
    }
}
