<?php

namespace App\Rules;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Dictionary;
use App\Models\Position;
use Closure;

final class PositionInDictionaryRule extends AbstractRule
{
    public function __construct(
        private readonly string $dictionaryId,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $facilityId = PermissionMiddleware::permissions()->facility?->id;
        /** @var Position $position */
        // Disabled positions are treated as merely deprecated, so they are accepted as well.
        $position = Position::query()->where('id', $value)->where('dictionary_id', $this->dictionaryId)->first();
        // The referenced position must be visible in the request's scope: the global rows, plus
        // the facility's own rows when the request is made in a facility. Without a facility
        // (the global endpoints) only the global rows qualify, as a global row referencing a
        // facility's position would be a dangling reference in every other facility. Values
        // referencing a facility's rows are therefore set through that facility's endpoints.
        if (
            $position
            && ($position->facility_id ?? $facilityId) === $facilityId
            && ($position->dictionary->facility_id ?? $facilityId) === $facilityId
        ) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.position_in_dictionary', [
            'dictionary' => Dictionary::query()->findOrFail($this->dictionaryId)->name,
        ]);
    }
}
