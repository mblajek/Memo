<?php

declare(strict_types=1);

namespace App\Models\Repositories;

use App\Eloquent\ModelRepository;
use App\Models\Timetable;

class TimetableRepository extends ModelRepository
{
    public function __construct(protected Timetable $model)
    {
    }
}
