<?php

namespace App\Http\Resources\ClientGroup;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\ClientGroup;
use App\Models\Meeting;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'ClientGroupResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'notes', type: 'string', example: 'Test', nullable: true),
        new OA\Property(property: 'meetingCount', type: 'int', example: 1),
        new OA\Property(
            property: 'clients', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/GroupClientResource'
        )
        ),
    ]
)] /**
 * @method __construct(Meeting $resource)
 * @mixin ClientGroup
 */
class ClientGroupResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'facilityId' => true,
            'notes' => true,
            'meetingCount' => true,
            'clients' => fn(self $clientGroup) => GroupClientResource::collection($clientGroup->groupClients),
        ];
    }
}
