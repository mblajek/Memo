<?php

namespace App\Http\Resources;

use App\Utils\Date\DateHelper;
use Closure;
use DateTimeInterface;
use Illuminate\Support\Str;

readonly class Mapping
{
    private function __construct(
        public bool $alwaysNull,
        public ?bool $fromSnake,
        public ?Closure $closure,
        public bool $nullToMissing,
    ) {
    }

    public static function any(bool|Closure|null|self $mapping): self|Closure
    {
        return ($mapping instanceof self) ? $mapping : match ($mapping) {
            true => self::snake(),
            false => self::camel(),
            null => self::null(),
            default => self::closure($mapping)
        };
    }

    public static function snake(): self
    {
        return new self(false, true, null, false);
    }

    public static function camel(): self
    {
        return new self(false, false, null, false);
    }

    public static function null(): self
    {
        return new self(true, null, null, false);
    }

    public static function closure(\Closure $closure): self
    {
        return new self(false, null, $closure, false);
    }

    public function nullToMissing(): self
    {
        return new self($this->alwaysNull, $this->fromSnake, $this->closure, true);
    }

    public function map(AbstractJsonResource $resource, string $propertyName)
    {
        $property = $this->alwaysNull ? null : (($this->closure) ? ($this->closure)($resource)
            : $resource->{$this->fromSnake ? Str::snake($propertyName) : $propertyName});
        return ($property instanceof DateTimeInterface) ? DateHelper::toZuluString($property)
            : ($this->nullToMissing ? ($property ?? Missing::get()) : $property);
    }
}
