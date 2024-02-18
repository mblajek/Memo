<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractJsonResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityStaffResource',
    properties: [
        new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: false),
    ]
)] /**
 * @method __construct(User $resource)
 * @property bool has_facility_admin
 * @mixin User
 */
class FacilityStaffResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'hasFacilityAdmin' => true,
        ];
    }
}
