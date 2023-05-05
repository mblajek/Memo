<?php

declare(strict_types=1);

namespace App\Models\Repositories;

use App\Eloquent\ModelRepository;
use App\Models\Facility;

class FacilityRepository extends ModelRepository
{
    public function __construct(protected Facility $model)
    {
    }
}
