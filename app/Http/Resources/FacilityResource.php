<?php

namespace App\Http\Resources;

use App\Models\Facility;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Annotations as OA;

/**
 * @method __construct(Facility $resource)
 * @mixin Facility
 *
 * @OA\Schema(
 *     schema="FacilityResource",
 *     @OA\Property(property="id", type="string", format="uuid", example="UUID"),
 *     @OA\Property(property="name", type="string", example="Test"),
 *     @OA\Property(property="url", type="string", example="test"),
 * )
 */
class FacilityResource extends JsonResource
{
    use ResourceTrait;

    protected static function getMappedFields(): array
    {
        return ['id', 'name', 'url'];
    }
}
