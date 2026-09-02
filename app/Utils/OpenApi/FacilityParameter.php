<?php

namespace App\Utils\OpenApi;

class FacilityParameter extends UuidPathParameter
{
    public function __construct()
    {
        parent::__construct('facility');
    }
}
