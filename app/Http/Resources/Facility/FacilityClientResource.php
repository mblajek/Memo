<?php

namespace App\Http\Resources\Facility;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\Client;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'FacilityClientResource',
    description: 'Also has the values of the client attributes, keyed by their apiName.',
    properties: [
        new OA\Property(property: 'shortCode', type: 'string', example: '00123'),
        new OA\Property(
            property: 'groupIds',
            type: 'array',
            items: new OA\Items(type: 'string', format: 'uuid', example: 'UUID'),
        ),
    ],
    additionalProperties: true,
    allOf: [new OA\Schema(ref: '#/components/schemas/AbstractJsonResource')],
)] /**
 * @method __construct(User $resource)
 * @mixin Client
 */
class FacilityClientResource extends AbstractOpenApiResource
{
    protected function withAttrValues(): bool
    {
        return true;
    }

    protected static function getMappedFields(): array
    {
        return [
            'shortCode' => true,
            'groupIds' => fn(self $client) => $client->groupClients->pluck('client_group_id'),
        ];
    }
}
