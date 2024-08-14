<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use Illuminate\Http\Resources\MissingValue;

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

    /** @var self[] */
    public const array GROUP = [self::and, self::or];
    /** @var self[] */
    public const array CMP = [self::lt, self::le, self::gt, self::ge];
    /** @var self[] */
    public const array LIKE = [self::lv, self::pv, self::vp, self::pvp, self::regexp];
    /** @var self[] - filter "val" is list */
    public const array LIST_FILTER = [self::in, self::has_all, self::has_any, self::has_only];
    /** @var self[] - db column is list */
    public const array LIST_COLUMN = [self::has, self::has_all, self::has_any, self::has_only];

    public function sqlOperator(): string|MissingValue
    {
        return match ($this) {
            self::eq => '=',
            self::null => 'is null',
            self::lt => '<',
            self::le => '<=',
            self::gt => '>',
            self::ge => '>=',
            self::lv, self::pv, self::vp, self::pvp => 'like',
            self::regexp => 'regexp binary',
            self::in => 'in',
            default => new MissingValue(),
        };
    }

    public function prepareIfLikeValue(bool|int|string|array $value): bool|int|string|array
    {
        if (!in_array($this, [self::pv, self::vp, self::pvp])) {
            return $value;
        }
        if (!is_string($value)) {
            throw FatalExceptionFactory::tquery();
        }
        return (($this === self::pv || $this === self::pvp) ? '%' : '')
            . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value)
            . (($this === self::vp || $this === self::pvp) ? '%' : '');
    }
}
