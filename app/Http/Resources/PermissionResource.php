<?php

namespace App\Http\Resources;

use App\Http\Permissions\PermissionObject;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;


#[OA\Schema(
    schema: 'PermissionsResource',
    properties: [
        new OA\Property(property: 'unverified', type: 'bool', example: 'false'),
        new OA\Property(property: 'verified', type: 'bool', example: 'true'),
        new OA\Property(property: 'globalAdmin', type: 'bool', example: 'false'),
    ]
)] /**
 * @method __construct(PermissionObject $resource)
 * @mixin PermissionObject
 */
class PermissionResource extends JsonResource
{
    use ResourceTrait;

    protected static function getMappedFields(): array
    {
        return [
            'unverified' => false,
            'verified' => false,
            'globalAdmin' => false,
            //'facilityMember',
            //'facilityClient',
            //'facilityStaff',
            //'facilityAdmin'
        ];
    }
}
