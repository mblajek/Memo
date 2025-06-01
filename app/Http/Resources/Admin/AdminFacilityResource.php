<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'AdminFacilityResource',
    properties: [
        new OA\Property(property: 'contactPhone', type: 'string'),
        new OA\Property(property: 'meetingNotificationTemplateSubject', type: 'string'),
        new OA\Property(property: 'meetingNotificationTemplateMessage', type: 'string'),
    ],
)]
/**
 * @method __construct(Facility $resource)
 * @mixin Facility
 */
class AdminFacilityResource extends FacilityResource
{
    protected static function getMappedFields(): array
    {
        return array_merge(parent::getMappedFields(), [
            'contactPhone' => true,
            'meetingNotificationTemplateSubject' => true,
            'meetingNotificationTemplateMessage' => true,
        ]);
    }
}
