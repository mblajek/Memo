<?php

namespace App\Tquery\Filter;

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
}
