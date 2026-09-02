<?php

namespace App\Services\Attribute;

use App\Exceptions\ApiException;
use App\Models\Attribute;
use App\Services\DefaultOrderManager;
use App\Services\GuardedDelete;
use Throwable;

class DeleteAttributeService
{
    use AttributeValidation;

    /** @throws ApiException|Throwable */
    public function handle(Attribute $attribute): void
    {
        $this->assertNotFixed($attribute);
        $this->assertNotReferenced($attribute);
        // values.attribute_id is a foreign key; GuardedDelete reports a racing value insert as in_use
        GuardedDelete::transaction(function () use ($attribute) {
            $table = $attribute->table->value;
            $order = DefaultOrderManager::lockedOrder('attributes', $attribute->id);
            $attribute->deleteOrFail();
            DefaultOrderManager::remove('attributes', 'table', $table, $order);
        });
    }
}
