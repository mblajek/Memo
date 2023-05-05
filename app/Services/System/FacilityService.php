<?php

namespace App\Services\System;

use App\Models\Repositories\FacilityRepository;
use Illuminate\Database\Eloquent\Collection;

class FacilityService
{
    public function __construct(protected readonly FacilityRepository $repository)
    {}

    public function getList(): Collection
    {
        return $this->repository->getList();
    }
}
