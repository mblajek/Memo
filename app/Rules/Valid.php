<?php

namespace App\Rules;

use App\Models\Dictionary;
use App\Models\UuidEnum\DictionaryUuidEnum;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator as ValidatorFacade;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\ValidationException;
use App\Utils\ConditionalArrayRule;

/**
 * Rule generator
 * default:
 * - value is present and is of specified type
 * sometimes:
 * - if value doesn't appear in data, other validations (also nullable) are skipped
 * nullable:
 * - if value is null, other validations are skipped, [] and " " are not null in opposite to Laravel validation
 */
class Valid extends AbstractDataRule
{
    /** reset all rules having state */
    public static function reset(): void
    {
        UniqueWithMemoryRule::reset();
    }

    public static function bool(array $rules = [], bool $sometimes = false, bool $nullable = false): array
    {
        return self::base($sometimes, $nullable, ['boolean', DataTypeRule::bool()], $rules);
    }

    public static function int(array $rules = [], bool $sometimes = false, bool $nullable = false): array
    {
        return self::base($sometimes, $nullable, ['numeric', 'integer', DataTypeRule::int()], $rules);
    }

    public static function string(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
        int $max = 250,
    ): array {
        return self::base($sometimes, $nullable, ['string', 'min:1', "max:$max"], $rules);
    }

    public static function trimmed(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
        int $max = 250,
    ): array {
        return self::base($sometimes, $nullable, ['string', 'min:1', "max:$max", new StringIsTrimmedRule()], $rules);
    }

    public static function uuid(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
    ): array {
        return self::base($sometimes, $nullable, ['string', 'lowercase', 'uuid'], $rules);
    }

    public static function dict(
        string|Dictionary|DictionaryUuidEnum $dictionary,
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
    ): array {
        $dictionaryId = ($dictionary instanceof DictionaryUuidEnum) ? $dictionary->value
            : (($dictionary instanceof Dictionary) ? $dictionary->id : $dictionary);
        return self::uuid([new PositionInDictionaryRule($dictionaryId), ...$rules], $sometimes, $nullable);
    }

    public static function array(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
        array $keys = [],
    ): array {
        return self::base($sometimes, $nullable, ['array' . (count($keys) ? (':' . implode(',', $keys)) : '')], $rules);
    }

    public static function list(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
        int $min = 1,
    ): array {
        return self::base($sometimes, $nullable, ['array', "min:$min", new ArrayIsListRule()], $rules);
    }

    public static function date(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
    ): array {
        return self::base($sometimes, $nullable, ['string', 'date_format:Y-m-d'], $rules);
    }

    public static function datetime(
        array $rules = [],
        bool $sometimes = false,
        bool $nullable = false,
    ): array {
        return self::base($sometimes, $nullable, ['string', 'date_format:Y-m-d\\TH:i:s\\Z'], $rules);
    }

    private readonly array $rules;

    private function __construct(
        private readonly bool $nullable,
        array $rules,
    ) {
        $this->rules = Arr::flatten(
            array_map(ConditionalArrayRule::processIfConditionalArray(...), $rules)
        );
    }

    /** forward ignore to inner Unique rules */
    public function ignore(Model|string $id): void
    {
        foreach ($this->rules as $rule) {
            if ($rule instanceof Unique) {
                $rule->ignore($id);
            }
        }
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null) {
            if (!$this->nullable) {
                $this->validator->addFailure($attribute, 'required');
            }
            return;
        }

        try {
            ValidatorFacade::validate($this->data, [$attribute => $this->rules]);
        } /** @noinspection PhpRedundantCatchClauseInspection */
        catch (ValidationException $validationException) {
            foreach ($validationException->validator->failed() as $fieldErrors) {
                foreach ($fieldErrors as $rule => $interpolationData) {
                    $this->validator->addRules([$attribute => $this->rules]);
                    $ruleOrClass = str_contains($rule, '\\') ? $rule : Str::snake($rule);
                    $this->validator->addFailure($attribute, $ruleOrClass, $interpolationData);
                }
            }
        }
    }

    private static function base(bool $sometimes, bool $nullable, array $rules, array $additionalRules): array
    {
        return array_merge(
            $sometimes ? ['sometimes'] : [],
            // todo: consider: ['present', new self($nullable, ['bail', ...$rules]), ...$additionalRules],
            ['present', new self($nullable, array_merge(['bail'], $rules, $additionalRules))],
        );
    }
}
