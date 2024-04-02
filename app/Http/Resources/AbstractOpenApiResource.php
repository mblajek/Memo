<?php

namespace App\Http\Resources;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'AbstractJsonResource',
    properties: [
        new OA\Property(property: 'createdAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'updatedAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
        new OA\Property(property: 'createdBy', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'updatedBy', type: 'string', format: 'uuid', example: 'UUID'),
    ],
)]
abstract class AbstractOpenApiResource extends AbstractJsonResource
{
}
