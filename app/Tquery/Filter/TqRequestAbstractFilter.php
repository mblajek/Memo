<?php

namespace App\Tquery\Filter;

use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Support\Facades\Validator;

abstract readonly class TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, array $path): self
    {
        return match (self::validate($data, ['type' => 'required|string|in:column,op'], $path)) {
            'op' => TqRequestFilterGroup::fromArray($config, $data, $path),
            'column' => TqRequestFilterColumn::fromArray($config, $data, $path),
        };
    }

    protected function __construct(
        public TqFilterOperator $operator,
        public bool $inverse,
    ) {
    }

    /** @return string[] */
    abstract public function getColumnAliases(): array;

    abstract public function applyFilter(TqBuilder $builder, bool $or, bool $invert): void;

    protected static function validate(array $data, array $validator, array $path): mixed
    {
        $pathStr = implode('.', $path);
        $validated = Validator::validate(
            $data,
            array_combine(array_map(fn(string $key) => trim("$pathStr.$key", '.'), array_keys($validator)), $validator)
        );
        foreach ($path as $part) {
            $validated = $validated[$part] ?? null;
        }
        return (count($validator) === 1) ? current($validated) : $validated;
    }
}
