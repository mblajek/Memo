<?php

namespace App\Http\Resources\Meeting;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\MeetingResource;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingResourceResource',
    properties: [
        new OA\Property(property: 'resourceDictId', type: 'string', format: 'uuid', example: 'UUID'),
    ]
)] /**
 * @method __construct(MeetingResource $resource)
 * @mixin MeetingResource
 */
class MeetingResourceResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'resourceDictId' => true,
        ];
    }
}
