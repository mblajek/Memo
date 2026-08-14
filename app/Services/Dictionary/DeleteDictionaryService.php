<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Models\Dictionary;
use App\Services\GuardedDelete;
use Throwable;

class DeleteDictionaryService
{
    use DictionaryValidation;

    /** @throws ApiException|Throwable */
    public function handle(Dictionary $dictionary): void
    {
        $this->assertNotFixed($dictionary);
        $this->assertNotReferenced($dictionary);
        GuardedDelete::transaction(fn() => $dictionary->deleteOrFail());
    }
}
