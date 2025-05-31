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

        $facility->fillOnly($data, [
            'name',
            'url',
            'meeting_notification_template_subject',
            'meeting_notification_template_message',
        ]);

        return $facility->id;
    }
}
