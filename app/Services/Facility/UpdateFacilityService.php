<?php

namespace App\Services\Facility;

use App\Models\Facility;
use Throwable;

class UpdateFacilityService
{
    /**
     * @throws Throwable
     */
    public function handle(Facility $facility, array $data): void
    {
        $facility->updateOrFail($data);
    }
}
