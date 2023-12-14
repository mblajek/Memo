<?php

namespace App\Utils\OpenApi;

use OpenApi\Attributes as OA;

class FacilityParameter extends OA\Parameter
{
    public function __construct()
    {
        parent::__construct(
            name: 'facility',
            description: 'Facility id',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
        );
    }
}
