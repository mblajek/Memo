<?php

namespace App\Services\Position;

use App\Exceptions\ApiException;
use App\Models\Position;
use App\Services\DefaultOrderManager;
use App\Services\GuardedDelete;
use Throwable;

class DeletePositionService
{
    use PositionValidation;

    /** @throws ApiException|Throwable */
    public function handle(Position $position): void
    {
        $this->assertNotFixed($position);
        $this->assertNotReferenced($position);
        // positions are referenced by foreign keys from many tables (meetings, clients, ...);
        // GuardedDelete reports those references the same way as attribute values
        GuardedDelete::transaction(function () use ($position) {
            $dictionaryId = $position->dictionary_id;
            $order = DefaultOrderManager::lockedOrder('positions', $position->id);
            $position->deleteOrFail();
            DefaultOrderManager::remove('positions', 'dictionary_id', $dictionaryId, $order);
        });
    }
}
