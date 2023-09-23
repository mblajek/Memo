<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;

enum TqFilterOperator: string
{
    case eq = '=';
    case eqs = '==';
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
    // array
    case in = 'in';
    case all = 'all';
    case any = 'any';

    /** @var TqFilterOperator[] */
    public const GROUP = [self::and, self::or];
    /** @var TqFilterOperator[] */
    public const CMP = [self::lt, self::le, self::gt, self::ge];
    /** @var TqFilterOperator[] */
    public const LIKE = [self::lv, self::pv, self::vp, self::pvp];
    /** @var TqFilterOperator[] */
    public const ARR = [self::in, self::all, self::any];

    public function prepareValue(bool|int|string|array|null $value): bool|int|string|array|null
    {
        if ($this !== self::lv && in_array($this, self::LIKE)) {
            return (($this === self::pv || $this === self::pvp) ? '%' : '')
                . (is_string($value) ? str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value)
                    : (throw FatalExceptionFactory::tquery()))
                . (($this === self::vp || $this === self::pvp) ? '%' : '');
        }
        return $value;
    }

    public function getSqlOperator(): ?string
    {
        return match ($this) {
            self::eq => '=',
            self::eqs => throw new \Exception('To be implemented'),
            self::null => 'is null',
            self::lt => '<',
            self::le => '<=',
            self::gt => '>',
            self::ge => '>=',
            self::lv, self::pv, self::vp, self::pvp => 'like',
            self::in => 'in',
            self::all => throw new \Exception('To be implemented'),
            self::any => throw new \Exception('To be implemented'),
            default => FatalExceptionFactory::tquery(),
        };
    }
}
