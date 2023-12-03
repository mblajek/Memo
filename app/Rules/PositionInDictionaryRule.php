<?php

namespace App\Rules;

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
        if (Position::query()->where('dictionary_id', $this->dictionaryId)->where('id', $value)->exists()) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.position_in_dictionary', [
            'dictionary' => $this->dictionaryId,
        ]);
    }
}
