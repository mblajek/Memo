<?php

namespace App\Http\Resources;

use App\Http\Permissions\PermissionObject;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Annotations as OA;

/**
 * @method __construct(PermissionObject $resource)
 * @mixin PermissionObject
 *
 * @OA\Schema(
 *     schema="PermissionsResource",
 *     @OA\Property(property="unverified", type="bool", example="false"),
 *     @OA\Property(property="verified", type="bool", example="true"),
 *     @OA\Property(property="globalAdmin", type="bool", example="false"),
 * )
 */
class PermissionResource extends JsonResource
{
    use ResourceTrait;

    protected static function getMappedFields(): array
    {
        return [
            'unverified',
            'verified',
            'globalAdmin',
            //'facilityMember',
            //'facilityClient',
            //'facilityStaff',
            //'facilityAdmin'
        ];
    }
}
