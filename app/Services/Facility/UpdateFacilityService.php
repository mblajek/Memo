<?php

namespace App\Services\Facility;

use App\Models\Facility;
use Ramsey\Uuid\UuidInterface;
use Throwable;

class UpdateFacilityService
{
    /**
     * @throws Throwable
     */
    public function handle(UuidInterface $id, array $data): string
    {
        $facility = Facility::query()->findOrFail($id->toString());
        $facility->updateOrFail($data);

        return $facility->id;
    }
}
