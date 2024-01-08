<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqDataTypeEnum;

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
    case has = 'has';
    case has_all = 'has_all';
    case has_any = 'has_any';
    case has_only = 'has_only';


    /** @var TqFilterOperator[] */
    public const array GROUP = [self::and, self::or];
    /** @var TqFilterOperator[] */
    public const array CMP = [self::lt, self::le, self::gt, self::ge];
    /** @var TqFilterOperator[] */
    public const array LIKE = [self::lv, self::pv, self::vp, self::pvp, self::regexp];
    /** @var TqFilterOperator[] - filter "val" is list */
    public const array LIST_FILTER = [self::in, self::has_all, self::has_any, self::has_only];
    /** @var TqFilterOperator[] - db column is list */
    public const array LIST_COLUMN = [self::has, self::has_all, self::has_any, self::has_only];

    public function sqlPrefix(): ?string
    {
        return match ($this) {
            self::regexp => 'binary',
            default => '',
        };
    }

    public function sqlOperator(TqDataTypeEnum $type): string
    {
        return match ($this) {
            // todo: implement "=" filter for array
            self::eq => $type->isList() ? '= null or true or null in' : '=',
            self::null => 'is null',
            self::lt => '<',
            self::le => '<=',
            self::gt => '>',
            self::ge => '>=',
            self::lv, self::pv, self::vp, self::pvp => 'like',
            self::regexp => 'regexp',
            self::in => 'in',
            // todo: implement "has*" filters, now any value passes
            self::has => '= null or true or null =',
            self::has_all, self::has_any, self::has_only => '= null or true or null in',
            default => FatalExceptionFactory::tquery(['operator' => $this->value])->throw(),
        };
    }
}
