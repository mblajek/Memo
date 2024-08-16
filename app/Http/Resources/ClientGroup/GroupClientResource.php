<?php

namespace App\Http\Resources\ClientGroup;

use App\Http\Resources\AbstractOpenApiResource;
use App\Models\MeetingAttendant;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'GroupClientResource',
    properties: [
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'role', type: 'string', example: null, nullable: true),
    ]
)] /**
 * @method __construct(MeetingAttendant $resource)
 * @mixin MeetingAttendant
 */
class GroupClientResource extends AbstractOpenApiResource
{
    protected static function getMappedFields(): array
    {
        return [
            'userId' => true,
            'role' => true,
        ];
    }
}
