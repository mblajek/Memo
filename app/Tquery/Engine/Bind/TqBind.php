<?php

namespace App\Tquery\Engine\Bind;

use App\Exceptions\FatalExceptionFactory;

abstract readonly class TqBind
{
    private bool $used;

    public static function list(array $value): self
    {
        return new TqListBind($value);
    }

    public static function single(bool|int|string $value): self
    {
        return new TqSingleBind($value);
    }

    public static function any(bool|int|string|array|null $value): ?self
    {
        if (is_array($value)) {
            return self::list($value);
        } elseif (!is_null($value)) {
            return self::single($value);
        }
        return null;
    }


    abstract public function asArray(): array;

    public function bindings(): array
    {
        if ($this->used ?? false) {
            return $this->asArray();
        }
        FatalExceptionFactory::tquery()->throw();
    }

    public function use(): string
    {
        // this class may support multiple use() calls, then $builder->where $bindings
        // must me multiplicated by number of calls: [1,2,3] => [1,2,3,1,2,3]
        if ($this->used ?? false) {
            FatalExceptionFactory::tquery()->throw();
        }
        $this->used = true;
        return ($this instanceof TqListBind) ? ('(' . trim(str_repeat('?,', $this->length), ',') . ')') : '?';
    }
}
