<?php

namespace App\Models\Traits;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\Facility;

/** For facility-scoped models whose facility_id may also be null (a global row). */
trait BelongsToFacility
{
    /**
     * Rejects an entity that does not belong to the given facility (the route facility by
     * default). A global row (null facility_id) belongs to no facility and is rejected too.
     *
     * @throws ApiException
     */
    public function belongsToFacilityOrFail(?Facility $facility = null): void
    {
        $facility ??= PermissionMiddleware::facility();
        if ($this->facility_id !== $facility->id) {
            ExceptionFactory::notFound()->throw();
        }
    }
}
