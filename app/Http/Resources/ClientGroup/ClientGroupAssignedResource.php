<?php

namespace App\Http\Resources\ClientGroup;

use App\Http\Resources\AbstractJsonResource;
use App\Http\Resources\Mapping;
use Illuminate\Database\Eloquent\Collection;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'ClientGroupAssignResource',
    properties: [
        new OA\Property(property: 'omitted', type: 'array', items: new OA\Items(properties: [
            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
            new OA\Property(property: 'groupCount', type: 'int'),
        ])),
        new OA\Property(property: 'updated', type: 'array', items: new OA\Items(properties: [
            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
            new OA\Property(property: 'updateCount', type: 'int'),
        ])),
    ]
)] /**
 * @method __construct(Collection $resource)
 * @mixin Collection
 */
class ClientGroupAssignedResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        $itemResource = new class (null) extends AbstractJsonResource {
            protected static function getMappedFields(): array
            {
                return [
                    'userId' => true,
                    'groupCount' => Mapping::snake()->nullToMissing(),
                    'updateCount' => Mapping::snake()->nullToMissing(),
                ];
            }
        };
        return [
            'omitted' => fn(self $item) => $itemResource::collection($item->get('many', [])),
            'updated' => fn(self $item) => $itemResource::collection($item->get('one', [])),
        ];
    }
}
