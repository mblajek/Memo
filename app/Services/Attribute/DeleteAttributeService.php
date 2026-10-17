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
        GuardedDelete::transaction(function () use ($attribute) {
            $table = $attribute->table->value;
            $order = DefaultOrderManager::lockedOrder('attributes', $attribute->id);
            // checked under the row lock, which a save referencing the attribute must wait for
            $this->assertNotReferenced($attribute);
            $attribute->deleteOrFail();
            DefaultOrderManager::remove('attributes', 'table', $table, $order);
        });
    }
}
