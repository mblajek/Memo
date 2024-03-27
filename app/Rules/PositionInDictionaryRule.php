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
        $position = Position::query()->where('id', $value)->where('is_disabled', false)->first();
        if ($position && ($position->facility_id ?? $facilityId) === $facilityId
            && ($position->dictionary->facility_id ?? $facilityId) === $facilityId) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.position_in_dictionary', [
            'dictionary' => Dictionary::query()->findOrFail($this->dictionaryId)->name,
        ]);
    }
}
