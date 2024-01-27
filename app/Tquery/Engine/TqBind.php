<?php

namespace App\Tquery\Engine;

use App\Exceptions\FatalExceptionFactory;
use Stringable;

final readonly class TqBind implements Stringable
{
    private bool $used;

    private function __construct(
        public bool $isList,
        public int $length,
    ) {
    }

    public static function list(int $length): self
    {
        return new self(true, $length);
    }

    public static function single(): self
    {
        return new self(false, 1);
    }

    public function __toString(): string
    {
        // this class may support multiple __toString calls, then $builder->where $bindings
        // must me multiplicated by number of calls: [1,2,3] => [1,2,3,1,2,3]
        if ($this->used ?? false) {
            FatalExceptionFactory::tquery()->throw();
        }
        $this->used = true;
        return $this->isList ? ('(' . trim(str_repeat('?,', $this->length), ',') . ')') : '?';
    }
}
