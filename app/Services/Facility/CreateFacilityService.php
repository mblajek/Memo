<?php

namespace App\Services\Facility;

use App\Models\Facility;
use Throwable;

class CreateFacilityService
{
    /**
     * @throws Throwable
     */
    public function handle(array $data): string
    {
        $facility = new Facility();

        $facility->name = $data['name'];
        $facility->url = $data['url'];

        $facility->saveOrFail();

        return $facility->id;
    }
}
