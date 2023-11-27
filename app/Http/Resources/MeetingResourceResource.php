<?php

namespace App\Http\Resources;

use App\Models\MeetingResource;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingResourceResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'meetingId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'resourceDictId', type: 'string', format: 'uuid', example: 'UUID'),
    ]
)] /**
 * @method __construct(MeetingResource $resource)
 * @mixin MeetingResource
 */
class MeetingResourceResource extends AbstractJsonResource
{

    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'meetingId' => true,
            'resourceDictId' => true,
        ];
    }
}