<?php

namespace App\Models\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use App\Utils\ConditionalArrayRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

trait HasResourceValidator
{
    /** @param Model|null $original is only given during PATCH */
    abstract protected static function validationRules(
        bool $isResource,
        bool $isInsert,
        bool $isPatch,
        ?Model $original,
    ): array;

    public static function getResourceValidator(): array
    {
        return self::processRules(
            static::validationRules(isResource: true, isInsert: false, isPatch: false, original: null)
        );
    }

    public static function getInsertValidator(): array
    {
        return self::processRules(
            static::validationRules(isResource: false, isInsert: true, isPatch: false, original: null)
        );
    }

    public static function getPatchValidator(User $user): array
    {
        return self::processRules(
            static::validationRules(isResource: false, isInsert: false, isPatch: true, original: $user)
        );
    }

    /** Rules is an array of rules for each field. Field rules could be: a single string, an object, a "conditional
     * array" with a boolean as a first item or an array of the above. This function processes the "conditional arrays"
     * and returns one of those: a string, an array of "validators" which are either strings or objects.
     */
    private static function processRules(array $rules): array
    {
        return array_map(function ($fieldRules) {
            return Arr::flatten(array_map(ConditionalArrayRule::processIfConditionalArray(...), $fieldRules));
        }, $rules);
    }

    protected static function getRuleUnique(?User $original): Unique
    {
        $unique = Rule::unique('users', 'email');
        if ($original) {
            $unique->ignore($original->id);
        }
        return $unique;
    }
}
