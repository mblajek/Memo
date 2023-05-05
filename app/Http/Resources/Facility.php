<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Annotations as OA;

/**
 * @method __construct(Facility $resource)
 * @mixin \App\Models\Facility
 *
 * @OA\Schema(
 *     schema="FacilityResource",
 *     @OA\Property(property="id", type="string", format="uuid", example="62be61dc-9e92-4b69-b4c3-14f16cb9925d"),
 *     @OA\Property(property="name", type="string", example="name"),
 *     @OA\Property(property="url", type="number", example="/poz1/"),
 * )
 */
class Facility extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
        ];
    }
}
