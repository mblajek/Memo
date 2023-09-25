<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;

enum TqFilterOperator: string
{
    case eq = '=';
    case null = 'null';
    // group
    case and = '&';
    case or = '|';
    // cmp
    case lt = '<';
    case le = '<=';
    case gt = '>';
    case ge = '>=';
    // like
    case lv = 'lv';
    case pv = '%v';
    case vp = 'v%';
    case pvp = '%v%';
    case regexp = 'regexp';
    // array
    case in = 'in';
    case all = 'all';
    case any = 'any';

    /** @var TqFilterOperator[] */
    public const GROUP = [self::and, self::or];
    /** @var TqFilterOperator[] */
    public const CMP = [self::lt, self::le, self::gt, self::ge];
    /** @var TqFilterOperator[] */
    public const LIKE = [self::lv, self::pv, self::vp, self::pvp, self::regexp];
    /** @var TqFilterOperator[] */
    public const ARR = [self::in, self::all, self::any];

    public function valueValidator(): ?array
    {
        return in_array($this, self::LIKE) ? ['string'] : null;
    }

    public function prepareValue(bool|int|string|array|null $value): bool|int|string|array|null
    {
        if ($this !== self::lv && $this !== self::regexp && in_array($this, self::LIKE)) {
            return (($this === self::pv || $this === self::pvp) ? '%' : '')
                . (is_string($value) ? str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value)
                    : (throw FatalExceptionFactory::tquery()))
                . (($this === self::vp || $this === self::pvp) ? '%' : '');
        }
        return $value;
    }

    public function sqlPrefix(): ?string
    {
        return match ($this) {
            self::regexp => 'binary',
            default => '',
        };
    }

    public function sqlOperator(): ?string
    {
        return match ($this) {
            self::eq => '=',
            self::null => 'is null',
            self::lt => '<',
            self::le => '<=',
            self::gt => '>',
            self::ge => '>=',
            self::lv, self::pv, self::vp, self::pvp => 'like',
            self::regexp => 'regexp',
            self::in => 'in',
            self::all => throw new \Exception('To be implemented'),
            self::any => throw new \Exception('To be implemented'),
            default => FatalExceptionFactory::tquery(),
        };
    }
}
