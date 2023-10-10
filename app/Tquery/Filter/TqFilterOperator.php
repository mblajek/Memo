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
    case regexp = '/v/';
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
    /** @var TqFilterOperator[] */
    public const TRIMMED = [self::eq, self::in, self::all, self::any];

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
            self::all, self::any => throw FatalExceptionFactory::tquery(),
            default => FatalExceptionFactory::tquery(),
        };
    }
}
