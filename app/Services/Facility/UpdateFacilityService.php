<?php

namespace App\Services\Facility;

use App\Models\Facility;
use Throwable;

class UpdateFacilityService
{
    /**
     * @throws Throwable
     */
    public function handle(string $id, array $data): void
    {
        $facility = Facility::query()->findOrFail($id);
        $facility->updateOrFail($data);
    }
}
