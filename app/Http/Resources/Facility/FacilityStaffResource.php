<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractJsonResource;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityStaffResource',
    properties: [
    ]
)] /**
 * @method __construct(User $resource)
 * @mixin User
 */
class FacilityStaffResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [];
    }
}
